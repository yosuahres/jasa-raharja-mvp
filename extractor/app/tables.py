"""Read ruled tariff tables off a PDF page.

Every tariff book seen so far draws its tables with ruling lines, so pymupdf's
table finder gives reliable rows and cells. What it gets wrong is columns:
double rules leave hairline sliver columns, merged header cells cut words in
half, and one price cell can span several class columns. So header labels are
rebuilt from the words under each header cell, and body cells are matched to
header columns by x-position rather than by grid index.
"""

import re
from bisect import bisect_left, bisect_right
from dataclasses import dataclass

import pymupdf

from app.prices import parse_idr

pymupdf.no_recommend_layout()

# Header cells narrower than this are slivers between double rules.
MIN_COLUMN_WIDTH = 10

_HEADER_START = re.compile(r"^(NO\b|NO\.|NAMA|JENIS|URAIAN|KODE|TARIF|KELAS|OBYEK)", re.I)
_CURRENCY_ONLY = re.compile(r"^\(?\s*RP\.?\s*\)?$", re.I)
_CURRENCY_PART = re.compile(r"\(\s*RP\.?\s*\)", re.I)
_NO_LABEL = re.compile(r"^NO\.?$", re.I)
_UNIT_LABEL = re.compile(r"SATUAN|VOLUME", re.I)
_PRICE_LABEL = re.compile(
    r"TARIF|HARGA|BIAYA|JUMLAH|JASA|KELAS|VVIP|VIP|REGULER|EKSEKUTIF|PRIVAT|PAV\b|APS\b|"
    r"SUITE|DELUXE|STANDAR|PARAMEDIS|OBAT|\bI{1,3}\b|\bIV\b",
    re.I,
)
_DASHES = {"", "-", "--", "—", "–"}
# Real words that start a wrapped line, never the tail of a word cut at the cell edge.
_SHORT_WORDS = {
    "A", "AND", "AT", "BY", "FOR", "IN", "OF", "ON", "OR", "THE", "TO", "WITH", "NON", "PER",
    "DAN", "ATAU", "DI", "KE", "DG", "DGN", "YANG", "PADA", "DARI", "TIAP", "S/D",
}


@dataclass
class Column:
    x0: float
    x1: float
    label: str
    role: str = "text"  # no | group | name | unit | price

    @property
    def center(self) -> float:
        return (self.x0 + self.x1) / 2


@dataclass
class Cell:
    x0: float
    x1: float
    text: str
    columns: list[int]  # indexes into PageTable.columns


@dataclass
class PageTable:
    bbox: tuple[float, float, float, float]
    columns: list[Column]
    rows: list[list[Cell]]
    has_header: bool


class _Words:
    """A page's words, indexed by vertical centre for quick per-row lookups."""

    def __init__(self, page: pymupdf.Page):
        words = sorted(page.get_text("words"), key=lambda w: (w[1] + w[3]) / 2)
        self._words = words
        self._centers = [(w[1] + w[3]) / 2 for w in words]

    def in_band(self, y0: float, y1: float) -> list[tuple]:
        return self._words[bisect_left(self._centers, y0) : bisect_right(self._centers, y1)]


def read_tables(page: pymupdf.Page, previous_columns: list[Column] | None) -> list[PageTable]:
    """Tables on the page, top to bottom.

    A table that starts without a header row (it continues from the previous
    page) borrows `previous_columns` when it sits at the same x-position.
    """
    words = _Words(page)
    tables = []
    for found in sorted(page.find_tables().tables, key=lambda t: t.bbox[1]):
        table = _read_table(found, words, previous_columns)
        if table is None:
            continue
        tables.append(table)
        previous_columns = table.columns
    return tables


def _read_table(found, words: _Words, previous_columns: list[Column] | None) -> PageTable | None:
    texts = found.extract()
    header_count = _count_header_rows(texts)
    has_header = header_count > 0

    borrowed = not has_header and bool(previous_columns) and _same_layout(found.bbox, previous_columns)
    if has_header:
        columns = _header_columns(found, words, header_count)
    elif borrowed:
        columns = [Column(c.x0, c.x1, c.label, c.role) for c in previous_columns]
    else:
        columns = _grid_columns(found, texts)
    if not columns:
        return None

    rows = []
    for index in range(header_count, len(found.rows)):
        row = _read_row(found.rows[index], words, columns)
        if row:
            rows.append(row)

    if not borrowed:
        _assign_roles(columns, rows)
    return PageTable(found.bbox, columns, rows, has_header)


# ---------------------------------------------------------------- header


def _count_header_rows(texts: list[list[str | None]]) -> int:
    if not texts or not any(_HEADER_START.match(_flat(t)) for t in texts[0] if t):
        return 0
    count = 1
    for row in texts[1:]:
        if any(_looks_like_price(_flat(t)) for t in row if t):
            break
        # Sub-header rows sit under vertically merged cells (NO, NAMA), so the
        # first grid cell is covered, or hold only header words; numbering rows read 1, 2, 3, ...
        if row[0] is None or _is_numbering_row(row) or _is_header_words(row):
            count += 1
            continue
        break
    return count


def _is_header_words(row: list[str | None]) -> bool:
    values = [_flat(t) for t in row if t and _flat(t)]
    return bool(values) and all(is_header_text(v) for v in values)


def is_header_text(text: str) -> bool:
    """Column-header wording such as "NO", "TARIF (Rp)", "KELAS STANDART", "REGULER"."""
    return bool(_HEADER_START.match(text) or _CURRENCY_ONLY.match(text) or (_PRICE_LABEL.search(text) and len(text) <= 30))


def _is_numbering_row(row: list[str | None]) -> bool:
    values = [_flat(t) for t in row if t and _flat(t)]
    if len(values) < 2 or not all(v.isdigit() for v in values):
        return False
    numbers = [int(v) for v in values]
    return numbers[0] == 1 and all(b > a for a, b in zip(numbers, numbers[1:]))


def _header_columns(found, words: _Words, header_count: int) -> list[Column]:
    """One column per lowest header cell, labelled with every header above it."""
    cells = []  # (x0, y0, x1, y1, text)
    for row in found.rows[:header_count]:
        band = words.in_band(row.bbox[1], row.bbox[3])
        for bbox in row.cells:
            if bbox is None or bbox[2] - bbox[0] < MIN_COLUMN_WIDTH:
                continue
            text = _CURRENCY_PART.sub("", _words_text(bbox, band, min_overlap=0.5))
            # A header cell with no rule under it can swallow the first value ("TARIF (Rp) 30.000").
            text = re.sub(r"(\s+[\d.,]{4,})+$", "", text).strip()
            if text and not _CURRENCY_ONLY.match(text) and not text.isdigit():
                cells.append((*bbox, text))

    def is_leaf(cell) -> bool:
        return not any(
            other is not cell and other[1] >= cell[3] - 1 and cell[0] <= (other[0] + other[2]) / 2 <= cell[2]
            for other in cells
        )

    columns = []
    for leaf in sorted((c for c in cells if is_leaf(c)), key=lambda c: c[0]):
        center = (leaf[0] + leaf[2]) / 2
        above = sorted((c for c in cells if c[0] <= center <= c[2] and c[1] <= leaf[1]), key=lambda c: c[1])
        parts: list[tuple[float, float, str]] = []
        for cell in above:
            if parts and parts[-1][2] == cell[4]:
                continue
            split_word = re.fullmatch(r"[A-Za-z]{1,3}", cell[4]) and re.fullmatch(r"[A-Za-z]{4,}", parts[-1][2] if parts else "")
            if split_word and abs(parts[-1][0] - cell[0]) < 2 and abs(parts[-1][1] - cell[2]) < 2:
                # One header word split over two grid rows ("EKSEKUT" / "IF").
                parts[-1] = (cell[0], cell[2], f"{parts[-1][2]}{cell[4]}")
            else:
                parts.append((cell[0], cell[2], cell[4]))
        columns.append(Column(leaf[0], leaf[2], " / ".join(p[2] for p in parts)))
    return columns


def _grid_columns(found, texts: list[list[str | None]]) -> list[Column]:
    """Fallback for a headerless table: one unnamed column per grid column that holds text."""
    columns = []
    for index in range(found.col_count):
        spans = [
            row.cells[index]
            for row, row_texts in zip(found.rows, texts)
            if row.cells[index] is not None and _flat(row_texts[index] or "")
        ]
        if spans:
            columns.append(Column(min(s[0] for s in spans), max(s[2] for s in spans), f"Kolom {index + 1}"))
    return columns


def _same_layout(bbox, columns: list[Column]) -> bool:
    return abs(bbox[0] - columns[0].x0) < 15 and abs(bbox[2] - columns[-1].x1) < 15


# ---------------------------------------------------------------- body


def _read_row(row, words: _Words, columns: list[Column]) -> list[Cell]:
    band = words.in_band(row.bbox[1], row.bbox[3])
    cells = []
    for bbox in row.cells:
        if bbox is None:
            continue
        text = _cell_text(bbox, band)
        if not text:
            continue
        cells.append(Cell(bbox[0], bbox[2], text, _columns_under(bbox, columns)))
    return cells


def _columns_under(bbox, columns: list[Column]) -> list[int]:
    """Columns whose centre the cell covers; a merged price cell covers several."""
    covered = [i for i, c in enumerate(columns) if bbox[0] - 1 <= c.center <= bbox[2] + 1]
    if covered:
        return covered
    overlaps = [(min(bbox[2], c.x1) - max(bbox[0], c.x0), i) for i, c in enumerate(columns)]
    best_overlap, best = max(overlaps)
    if best_overlap > 0:
        return [best]
    center = (bbox[0] + bbox[2]) / 2
    return [min(range(len(columns)), key=lambda i: abs(columns[i].center - center))]


def _assign_roles(columns: list[Column], rows: list[list[Cell]]) -> None:
    values: dict[int, list[str]] = {i: [] for i in range(len(columns))}
    for row in rows:
        for cell in row:
            if len(cell.columns) == 1:
                values[cell.columns[0]].append(cell.text)

    for index, column in enumerate(columns):
        filled = [v for v in values[index] if v not in _DASHES]
        prices = sum(_looks_like_price(v) for v in filled)
        if _NO_LABEL.match(column.label.split(" / ")[0]):
            column.role = "no"
        elif _UNIT_LABEL.search(column.label):
            column.role = "unit"
        elif filled and prices / len(filled) >= 0.5:
            column.role = "price"
        elif not filled and _PRICE_LABEL.search(column.label) and index > 0:
            column.role = "price"
        else:
            column.role = "group"

    # The text column nearest the prices holds the item; ones left of it are groupings.
    text_columns = [i for i, c in enumerate(columns) if c.role == "group"]
    if text_columns:
        first_price = next((i for i, c in enumerate(columns) if c.role == "price"), len(columns))
        before_prices = [i for i in text_columns if i < first_price]
        columns[(before_prices or text_columns)[-1]].role = "name"


# ---------------------------------------------------------------- text


def _cell_text(bbox, band: list[tuple]) -> str:
    """Words whose centre lies in the cell, rebuilt line by line.

    Narrow columns force-wrap a word that is longer than the column
    ("ABSCESS,INCISIO" / "N AND ..."); such a line is a single word reaching the
    right edge, and is glued to the next line without a space.
    """
    inside = [
        w for w in band if bbox[0] <= (w[0] + w[2]) / 2 <= bbox[2] and bbox[1] <= (w[1] + w[3]) / 2 <= bbox[3]
    ]
    if not inside:
        return ""
    lines: list[list[tuple]] = []
    for word in sorted(inside, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
        if lines and abs((lines[-1][0][1] + lines[-1][0][3]) / 2 - (word[1] + word[3]) / 2) < 2.5:
            lines[-1].append(word)
        else:
            lines.append([word])

    # Text runs from the left padding to the same padding off the right rule.
    right = bbox[2] - (min(w[0] for w in inside) - bbox[0])
    text = ""
    previous: list[tuple] = []
    for line in lines:
        line.sort(key=lambda w: w[0])
        line_text = " ".join(w[4] for w in line)
        text = f"{text}{line_text}" if _force_wrapped(previous, line, right) else f"{text} {line_text}"
        previous = line
    return _clean(text)


def _force_wrapped(previous: list[tuple], line: list[tuple], right: float) -> bool:
    """True when `previous` is one word running into the right edge and `line` starts with its tail."""
    if len(previous) != 1:
        return False
    word = previous[0]
    char_width = (word[2] - word[0]) / max(len(word[4]), 1)
    tail = re.match(r"[A-Za-z]*", line[0][4]).group()
    if not 0 < len(tail) <= 4 or tail.upper() in _SHORT_WORDS:
        return False
    return word[2] + 1.5 * char_width >= right and word[4][-1:].isalpha()


def _words_text(bbox, band: list[tuple], min_overlap: float) -> str:
    """Words mostly inside the cell horizontally, so a word cut by a sliver column still counts."""
    picked = []
    for w in band:
        if not bbox[1] <= (w[1] + w[3]) / 2 <= bbox[3]:
            continue
        width = max(w[2] - w[0], 0.1)
        if (min(w[2], bbox[2]) - max(w[0], bbox[0])) / width >= min_overlap:
            picked.append(w)
    picked.sort(key=lambda w: (round((w[1] + w[3]) / 2 / 3), w[0]))
    return _clean(" ".join(w[4] for w in picked))


def _clean(text: str) -> str:
    text = text.replace("\u200b", " ").replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def _flat(text: str) -> str:
    return _clean(text.replace("\n", " "))


def _looks_like_price(text: str) -> bool:
    compact = text.replace(" ", "")
    if not re.search(r"\d", compact) or re.search(r"[a-zA-Z]{3,}", re.sub(r"(?i)^rp\.?", "", compact)):
        return False
    amount = parse_idr(compact)
    return amount is not None and amount >= 100
