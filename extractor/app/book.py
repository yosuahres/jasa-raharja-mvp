"""Turn a tariff book PDF into review rows by reading its ruled tables.

Tariff books differ in columns (class prices, old vs new tariff, PAV / non-PAV,
unit) and in how they nest items, so nothing here is tuned to one book:

- Headings outside tables ("3. RUMAH SAKIT ...", "II. RAWAT JALAN", "1.2 Tarif
  Ruangan") form the section path. A heading naming a hospital starts a new
  facility, because one regulation can carry several hospitals' tariffs.
- Inside a table, list markers (1 / a. / - ) nest items under their parent.
- Unpriced lines under a priced line ("6. Kelompok Bedah F  2.500.000" followed
  by a. ... h.) are kept on that row as `members`; they share its price.
- A row cut by a page break continues as an unnumbered, unpriced first row on
  the next page and is joined back.
"""

import re
import uuid
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

from app.prices import parse_idr
from app.tables import Cell, Column, PageTable, is_header_text, read_tables

MIN_TEXT_CHARS = 50
SECTION_SEPARATOR = " › "

_DASHES = {"", "-", "--", "—", "–"}
_SUPERSEDED = re.compile(r"\bLAMA\b", re.I)

_FACILITY = [
    re.compile(r"\bPADA\s+(?P<name>(?:RSUD|RSU|RUMAH SAKIT|RS|PUSKESMAS|PUSAT KESEHATAN|LABORATORIUM|UPT)\b.*)$", re.I),
    re.compile(r"^\d+\.\s+(?P<name>(?:RUMAH SAKIT|RSUD|RSU|RS)\b.*)$", re.I),
    re.compile(r"^BUKU TARIF\s+(?:REKANAN\s+)?(?P<name>.+?)(?:\s+TAHUN\b.*)?$", re.I),
]
_HEADING_STYLES = [
    ("lampiran", re.compile(r"^LAMPIRAN\b", re.I)),
    ("bab", re.compile(r"^BAB\s+[\dIVXL]+\b", re.I)),
    ("dotted", re.compile(r"^(\d+(?:\.\d+)+)\.?\s")),
    ("rdotted", re.compile(r"^[IVX]+\.[IVX\d]+\.?\s")),
    ("roman", re.compile(r"^([IVX]+)\.\s")),
    ("alpha", re.compile(r"^([A-Z])\.\s")),
    ("num", re.compile(r"^\d+\.\s")),
]
# Regulation-level headings: never inside one hospital's section.
_OUTLINE_STYLES = {"lampiran", "rdotted"}
_OUTLINE_TEXT = re.compile(r"RETRIBUSI|PENINJAUAN|PENAMBAHAN|PERUBAHAN", re.I)
# Lines that might be an outline or facility heading, for skipping pages cheaply.
_OUTLINE_CANDIDATE = re.compile(r"^(LAMPIRAN\b|[IVX]+\.[IVX\d]*\.?\s|[A-Z]\.\s+[A-Z]{3}|\d+\.\s+[A-Z][A-Z ]{3,})")
# Headings that still count while reading a "Keterangan" block of notes.
_STRONG_STYLES = {"lampiran", "bab", "rdotted", "roman"}
_NOTES = re.compile(r"^(Keterangan|Catatan|Ket\s*[.:]|\*)", re.I)
_NOISE = re.compile(r"^[-–\s]*\d+[-–\s]*$|\.\s?\.\s*$|^\(?\s*Rp\.?\s*\)?$", re.I)
_TABLE_HEADER_TEXT = re.compile(r"^(NAMA|JENIS)\s+(TINDAKAN|PELAYANAN)$", re.I)

# "a." and "a)" are different list levels in the same book, so the delimiter is part of the style.
_MARKERS = [
    ("num", re.compile(r"^(\d{1,3})\.\s*(?=\S)")),
    ("num)", re.compile(r"^(\d{1,3})\)\s*(?=\S)")),
    ("alpha", re.compile(r"^([a-z])\.\s*(?=\S)")),
    ("alpha)", re.compile(r"^([a-z])\)\s*(?=\S)")),
    ("dash", re.compile(r"^([-–•*])\s*")),
]


@dataclass
class _Line:
    text: str
    x0: float
    y0: float
    x1: float


@dataclass
class _Heading:
    style: str
    text: str
    y0: float  # of its last line
    x1: float


@dataclass
class _Item:
    """An entry in the list-nesting stack of the table being read."""

    style: str
    name: str
    row: dict | None = None  # the row emitted for this item, if it had prices
    member_of: tuple[dict, int] | None = None  # (row, index in row["members"])


@dataclass
class BookReader:
    facility_filter: str | None = None
    rows: list[dict] = field(default_factory=list)

    facility: str | None = None
    _facility_style: str | None = None
    _facility_heading: str | None = None
    _part: str | None = None  # regulation outline above the facility, e.g. "II. PENAMBAHAN ... › II.I RETRIBUSI JASA UMUM"
    _outer: list[tuple[str, str]] = field(default_factory=list)  # headings outside any facility
    _headings: list[tuple[str, str]] = field(default_factory=list)  # headings inside the current facility
    _pending: _Heading | None = None
    _notes: bool = False
    _table_section: str | None = None
    _groups: dict[int, str] = field(default_factory=dict)
    _items: list[_Item] = field(default_factory=list)
    _columns: list[Column] | None = None

    # ------------------------------------------------------------ pages

    def read_page(self, page: pymupdf.Page, number: int) -> dict:
        lines = _lines(page)
        stat = {"number": number, "has_text_layer": sum(len(l.text) for l in lines) > MIN_TEXT_CHARS, "tables": 0, "rows": 0}
        if not stat["has_text_layer"]:
            stat["status"] = "no_text"
            return stat
        if not self._wanted(lines):
            stat["status"] = "skipped"
            return stat

        before = len(self.rows)
        tables = read_tables(page, self._columns)
        elements: list[tuple[float, int, _Line | PageTable]] = [(t.bbox[1], 1, t) for t in tables]
        elements += [(l.y0, 0, l) for l in lines if not any(_inside(l, t.bbox) for t in tables)]
        first_table = True
        for _, kind, element in sorted(elements, key=lambda e: (e[0], e[1])):
            if kind == 0:
                self._line(element, page.rect.width)
            else:
                self._flush_heading()
                self._table(element, number, first_table)
                first_table = False
        self._flush_heading()

        stat.update(status="done", tables=len(tables), rows=len(self.rows) - before)
        return stat

    def _wanted(self, lines: list[_Line]) -> bool:
        """With a facility filter, skip other facilities' pages unless they may carry an outline heading.

        Rows read from such pages are dropped later; reading them keeps the outline
        (and so each row's `part`) right.
        """
        if not self.facility_filter or self._matches(self.facility):
            return True
        return any(_OUTLINE_CANDIDATE.match(line.text) or _facility_name(line.text) for line in lines)

    def _matches(self, facility: str | None) -> bool:
        return bool(facility) and self.facility_filter.upper() in facility.upper()

    # ------------------------------------------------------------ headings

    def _line(self, line: _Line, page_width: float) -> None:
        text = line.text
        if _NOISE.search(text):
            return
        style = _heading_style(text, self._active_headings())
        pending = self._pending
        wrapped = pending and pending.x1 > 0.7 * page_width and line.y0 - pending.y0 < 20
        if wrapped and style is None:
            pending.text = f"{pending.text} {text}"  # a long heading wrapped onto the next line
            pending.y0, pending.x1 = line.y0, line.x1
            return
        self._flush_heading()

        if _NOTES.match(text):
            self._notes = True
            return
        is_facility = _facility_name(text) is not None
        if style is None and not (is_facility or _is_caps_heading(text)):
            return
        if self._notes and not is_facility and style not in _STRONG_STYLES and not (style or "").startswith("dotted"):
            return
        self._pending = _Heading(style or "plain", text, line.y0, line.x1)

    def _flush_heading(self) -> None:
        heading, self._pending = self._pending, None
        if heading is None:
            return
        self._notes = False
        self._table_section = None
        self._groups = {}
        self._items = []

        facility = _facility_name(heading.text)
        if facility:
            if self.facility is None:
                self._part = SECTION_SEPARATOR.join(text for _, text in self._outer) or None
            self.facility, self._facility_style, self._facility_heading = facility, heading.style, heading.text
            self._headings = []
            return

        outline = heading.style in _OUTLINE_STYLES or bool(_OUTLINE_TEXT.search(heading.text))
        if self.facility and (outline or self._next_sibling_of_facility(heading)):
            self.facility = self._facility_style = self._facility_heading = self._part = None
            self._headings = []
        if heading.style == "lampiran":
            self._outer = []
        if self.facility:
            self._headings = _pushed(self._headings, heading.style, heading.text)
        else:
            self._outer = _pushed(self._outer, heading.style, heading.text)

    def _next_sibling_of_facility(self, heading: _Heading) -> bool:
        """'15. DINAS TENAGA KERJA' after '14. RUMAH SAKIT PARU': the hospital list moved on.

        A hospital's own headings can share the numbering style ('1. Pelayanan
        Kesehatan'), so a sibling must also be numbered after it and set in capitals.
        """
        if heading.style != self._facility_style or heading.style == "plain" or not _is_caps_heading(heading.text):
            return False
        return _ordinal(heading.text) > _ordinal(self._facility_heading or "")

    def _active_headings(self) -> list[tuple[str, str]]:
        return self._headings if self.facility else self._outer

    # ------------------------------------------------------------ tables

    def _table(self, table: PageTable, page_number: int, first_on_page: bool) -> None:
        self._notes = False
        self._columns = table.columns
        unlabelled = all(c.label.startswith("Kolom ") for c in table.columns)
        for index, cells in enumerate(table.rows):
            self._row(cells, table.columns, page_number, first_on_page and index == 0, unlabelled)

    def _row(self, cells: list[Cell], columns: list[Column], page_number: int, page_top: bool, unlabelled: bool) -> None:
        no, name, unit = "", "", ""
        groups: dict[int, str] = {}
        priced: list[tuple[str, list[Column]]] = []
        for cell in cells:
            role = _cell_role(cell, columns)
            if role == "price":
                priced.append((cell.text, [columns[i] for i in cell.columns]))
            elif role == "no":
                no = cell.text
            elif role == "unit":
                unit = cell.text
            elif role == "group":
                groups[cell.columns[0]] = cell.text
            else:
                name = f"{name} {cell.text}".strip()

        if _is_numbering(cells) or (_TABLE_HEADER_TEXT.match(name) and not priced):
            return
        if priced and all(is_header_text(text) for text, _ in priced):
            priced = []  # column headers repeated inside the body ("Kelas Standart | APS")
        for index, text in sorted(groups.items()):
            self._set_group(index, text)

        prices = _prices(priced)
        style, marker, clean_name = _split_marker(name)
        if no:
            if not re.fullmatch(r"\d+\.?", no) and not prices:
                # "I.1.1 RAWAT JALAN", "A  VISITE di R.PERAWATAN": a section inside the table.
                self._table_section = f"{no} {name}".strip()
                self._items = []
                return
            style, marker = "no", no.rstrip(".")
        if not clean_name and not prices:
            return

        if page_top and not no and style is None and not prices and not groups and self._items:
            self._continue_previous(clean_name)
            return

        parents = self._items_before(style)
        if style is None and prices:
            # An unmarked priced line after "a. ... s." lines is their sibling, not their child.
            while parents and parents[-1].row is not None:
                parents.pop()
        if prices:
            row = self._emit(page_number, marker, clean_name, parents, unit, prices, unlabelled)
            self._items = [*parents, _Item(style or "plain", clean_name, row=row)]
            return

        owner = next((i.row for i in reversed(parents) if i.row is not None), None)
        member_of = None
        if owner is not None:
            owner["members"].append(clean_name)
            member_of = (owner, len(owner["members"]) - 1)
        self._items = [*parents, _Item(style or "plain", clean_name, member_of=member_of)]

    def _set_group(self, index: int, text: str) -> None:
        if self._groups.get(index) == text:
            return
        self._groups = {k: v for k, v in self._groups.items() if k < index}
        self._groups[index] = text
        self._items = []

    def _items_before(self, style: str | None) -> list[_Item]:
        """The open items that a new item of this list style nests under."""
        if style == "no":
            return []
        items = list(self._items)
        if style is None:
            while items and items[-1].style == "plain":
                items.pop()
            return items
        for index, item in enumerate(items):
            if item.style == style:
                return items[:index]
        return items

    def _continue_previous(self, text: str) -> None:
        item = self._items[-1]
        item.name = f"{item.name} {text}"
        if item.row is not None:
            item.row["raw_name"] = f"{item.row['raw_name']} {text}"
            item.row["flags"].append("continued_across_pages")
        elif item.member_of is not None:
            row, index = item.member_of
            row["members"][index] = f"{row['members'][index]} {text}"

    def _emit(self, page_number, marker, name, parents, unit, prices, unlabelled) -> dict:
        section = [text for _, text in self._active_headings()]
        if self._table_section:
            section.append(self._table_section)
        section += [text for _, text in sorted(self._groups.items())]
        parent_names = [p.name.rstrip(" :;") for p in parents]

        flags = []
        if any(p["amount"] is None for p in prices):
            flags.append("unparsed_price")
        if unlabelled:
            flags.append("unlabelled_columns")

        row = {
            "id": uuid.uuid4().hex[:10],
            "facility": self.facility,
            "part": self._part if self.facility else None,
            "page": page_number,
            "item_no": marker,
            "raw_name": name,
            "parents": parent_names,
            "section": SECTION_SEPARATOR.join(section) or None,
            "unit": unit or None,
            "prices": prices,
            "members": [],
            "note": None,
            "flags": flags,
            "reviewed": False,
        }
        self.rows.append(row)
        return row


def extract_book(
    pdf_path: Path,
    facility: str | None = None,
    pages: Iterable[int] | None = None,
    on_page: Callable[[dict], None] | None = None,
    facility_name: str | None = None,
) -> tuple[list[dict], list[dict]]:
    """Rows and per-page stats for a tariff book. Page numbers are 1-based.

    `facility` keeps only facilities whose heading contains it (for regulations
    covering several hospitals); `facility_name` names the facility of a book
    that never prints one in its text, such as one whose title page is a scan.
    """
    reader = BookReader(facility_filter=facility, facility=facility_name)
    stats = []
    with pymupdf.open(pdf_path) as doc:
        numbers = pages or range(1, doc.page_count + 1)
        for number in numbers:
            stat = reader.read_page(doc[number - 1], number)
            stats.append(stat)
            if on_page:
                on_page(stat)
    rows = reader.rows
    if facility:
        rows = [r for r in rows if r["facility"] and facility.upper() in r["facility"].upper()]
    return rows, stats


# ---------------------------------------------------------------- helpers


def _lines(page: pymupdf.Page) -> list[_Line]:
    """Words grouped by visual line; pymupdf splits "1.2      Tarif Ruangan" at the wide gap."""
    grouped: list[list[tuple]] = []
    for word in sorted(page.get_text("words"), key=lambda w: ((w[1] + w[3]) / 2, w[0])):
        center = (word[1] + word[3]) / 2
        if grouped and abs((grouped[-1][0][1] + grouped[-1][0][3]) / 2 - center) < 2.5:
            grouped[-1].append(word)
        else:
            grouped.append([word])
    lines = []
    for words in grouped:
        words.sort(key=lambda w: w[0])
        text = re.sub(r"\s+", " ", " ".join(w[4] for w in words).replace("\u200b", " ")).strip()
        if text:
            lines.append(_Line(text, words[0][0], min(w[1] for w in words), words[-1][2]))
    return lines


def _inside(line: _Line, bbox) -> bool:
    y = line.y0 + 2
    return bbox[0] - 2 <= line.x0 <= bbox[2] and bbox[1] - 1 <= y <= bbox[3]


def _facility_name(text: str) -> str | None:
    for pattern in _FACILITY:
        match = pattern.search(text)
        if match:
            return match.group("name").strip(" .,:;")
    return None


def _pushed(headings: list[tuple[str, str]], style: str, text: str) -> list[tuple[str, str]]:
    """The heading stack after a new heading: it replaces the last one of its style and all below."""
    headings = [h for h in headings if h[0] != "plain"]
    if style != "plain":
        for index, (existing, _) in enumerate(headings):
            if existing == style:
                headings = headings[:index]
                break
    return [*headings, (style, text)]


def _heading_style(text: str, headings: list[tuple[str, str]]) -> str | None:
    for style, pattern in _HEADING_STYLES:
        match = pattern.match(text)
        if not match:
            continue
        if style == "dotted":
            return f"dotted{match.group(1).count('.') + 1}"
        if style == "roman" and len(match.group(1)) == 1:
            # "I. FARMASI" right after "H. FORENSIK" is a letter, not a numeral.
            previous_letter = chr(ord(match.group(1)) - 1)
            if any(s == "alpha" and t.startswith(f"{previous_letter}.") for s, t in headings):
                return "alpha"
        return style
    return None


def _ordinal(heading: str) -> int:
    match = re.match(r"^(\d+|[A-Z])\.", heading)
    if not match:
        return 0
    value = match.group(1)
    return int(value) if value.isdigit() else ord(value) - ord("A") + 1


def _is_caps_heading(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    return 3 <= len(letters) and len(text) <= 80 and sum(c.isupper() for c in letters) / len(letters) >= 0.8


def _split_marker(name: str) -> tuple[str | None, str | None, str]:
    for style, pattern in _MARKERS:
        match = pattern.match(name)
        if match:
            marker = None if style == "dash" else match.group(1)
            return style, marker, name[match.end() :].strip()
    return None, None, name


def _cell_role(cell: Cell, columns: list[Column]) -> str:
    roles = [columns[i].role for i in cell.columns]
    if "name" in roles:
        return "name"
    if all(r == "price" for r in roles):
        return "price"
    return roles[0]


def _is_numbering(cells: list[Cell]) -> bool:
    values = [c.text for c in cells]
    if len(values) < 2 or not all(v.isdigit() for v in values):
        return False
    numbers = [int(v) for v in values]
    return numbers[0] == 1 and numbers == list(range(1, len(numbers) + 1))


def _prices(priced: list[tuple[str, list[Column]]]) -> list[dict]:
    prices = []
    for raw, columns in priced:
        compact = re.sub(r"\s+", "", raw)
        if compact in _DASHES:
            continue
        amount = parse_idr(compact)
        if amount is None:
            # Text such as "50% dari JM Dokter Spesialis": kept once, under the columns' shared label.
            label = _shared_label([c.label for c in columns])
            prices.append({"kelas": label, "raw_price": raw, "amount": None, "superseded": bool(_SUPERSEDED.search(label))})
            continue
        # A price merged across class columns applies to each of them.
        for column in columns:
            prices.append(
                {
                    "kelas": column.label,
                    "raw_price": compact,
                    "amount": amount,
                    "superseded": bool(_SUPERSEDED.search(column.label)),
                }
            )
    return prices


def _shared_label(labels: list[str]) -> str:
    if len(labels) == 1:
        return labels[0]
    split = [label.split(" / ") for label in labels]
    shared = []
    for parts in zip(*split):
        if len(set(parts)) != 1:
            break
        shared.append(parts[0])
    return " / ".join(shared) or " | ".join(labels)
