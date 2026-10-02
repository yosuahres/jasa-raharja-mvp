"""The hospital a document is about: which one, and the profile fields it prints.

A regulation can list many hospitals. A quick pass over the page text finds their
headings; the file name usually names the one that was meant ("TARIF RSUD DR
SOEDONO MADIUN.pdf"), otherwise the hospital with the most pages is taken. Only
that hospital is then extracted, which skips the rest of a long regulation.

Every profile field carries the text it was read from, so the preview can show
where it came from. A field the document doesn't print is left out, not guessed.
"""

import re
from collections import Counter
from pathlib import Path

import pymupdf

from app.book import _facility_name
from app.catalog import REGIONS

FRONT_PAGES = 3

_WORD = re.compile(r"[A-Z0-9]+")


def words(text: str | None) -> set[str]:
    return set(_WORD.findall((text or "").upper()))

_HOSPITAL = re.compile(r"^(RSUD|RSU|RS|RUMAH SAKIT)\b", re.I)
_ABBREVIATIONS = [
    (re.compile(r"\bRUMAH SAKIT UMUM DAERAH\b", re.I), "RSUD"),
    (re.compile(r"\bRUMAH SAKIT UMUM\b", re.I), "RSU"),
    (re.compile(r"\bRUMAH SAKIT\b", re.I), "RS"),
]
# Words in a file name that say what the document is rather than which hospital.
_FILE_NOISE = {
    "TARIF", "BUKU", "REKANAN", "TAHUN", "UPDATE", "PERDA", "PERGUB", "PERBUP", "PERWALI", "NOMOR", "NO",
    "PERATURAN", "DAERAH", "GUBERNUR", "BUPATI", "WALIKOTA", "LAMPIRAN", "RSUD", "RSU", "RS", "RUMAH",
    "SAKIT", "UMUM", "DR", "DRS", "PDF", "FINAL", "REVISI", "BARU", "LAYANAN", "PELAYANAN", "KESEHATAN",
}
_FILE_PREFIX = re.compile(r"^(\d+\.\s*)?(PERDA\s+NOMOR\s+\d+\s+TAHUN\s+\d{4}\s+)?(BUKU\s+)?(TARIF\s+)?(REKANAN\s+)?", re.I)
_FILE_SUFFIX = re.compile(r"(\s+TAHUN\s+\d{4}.*|_.*)$", re.I)

# Longest first, so "Tangerang Selatan" wins over "Tangerang".
_PLACES = sorted(((name, province) for province, names in REGIONS.items() for name in names), key=lambda p: -len(p[0]))
_REGION_PREFIX = re.compile(r"\b(KABUPATEN|KAB\.|KOTA)\s+([A-Z][A-Z ]{2,30})", re.I)
_PROVINCE = re.compile(r"\bPROVINSI\s+([A-Z][A-Z ]{2,30}?)(?:\s+NOMOR|\s+TAHUN|\s*$|\n)", re.I)
_YEAR = re.compile(r"\bTAHUN\s+(20\d{2})\b", re.I)
_BARE_YEAR = re.compile(r"\b(20\d{2})\b")
_ADDRESS = re.compile(r"\b(?:Jl\.?|Jln\.?|Jalan)\s+[A-Za-z0-9 .,'/-]{4,80}", re.I)
_KELAS = re.compile(r"\b(?:KELAS|TIPE|TYPE)\s+([ABCD])\b(?!\s*[/.]?\s*[IVX\d])")
_GOVERNMENT = re.compile(r"\b(RSUD|RSU DAERAH|PERATURAN (DAERAH|GUBERNUR|BUPATI|WALIKOTA)|PERDA|PERGUB|PEMERINTAH (KABUPATEN|KOTA|PROVINSI))\b", re.I)
_MILITARY = re.compile(r"\b(BHAYANGKARA|TNI|POLRI|RSAD|RSAL|RSAU|KESDAM|RUMKIT)\b", re.I)
_STATE_COMPANY = re.compile(r"\b(PELNI|PERTAMINA|PTPN|BUMN|PELINDO)\b", re.I)
_PRIVATE = re.compile(r"\b(UNIVERSITAS|YAYASAN|SWASTA|UBAYA|SILOAM|MITRA KELUARGA|HERMINA)\b", re.I)


def short_name(name: str) -> str:
    """'RUMAH SAKIT UMUM DAERAH DR. SOEDONO' as 'RSUD DR. SOEDONO'."""
    for pattern, abbreviation in _ABBREVIATIONS:
        name = pattern.sub(abbreviation, name)
    return re.sub(r"\s+", " ", name).strip(" .,:;")


def name_from_file(file_name: str) -> str:
    """'Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf' as 'RS Ubaya'."""
    stem = Path(file_name).stem
    stem = _FILE_SUFFIX.sub("", _FILE_PREFIX.sub("", stem))
    return short_name(stem) or Path(file_name).stem


def prescan(pdf: Path) -> dict:
    """Hospital headings with how many pages each spans, and the text of the first pages."""
    pages: Counter[str] = Counter()
    front = []
    current = None
    with pymupdf.open(pdf) as doc:
        for index, page in enumerate(doc):
            text = page.get_text("text")
            if index < FRONT_PAGES:
                front.append(text)
            for line in text.splitlines():
                name = _facility_name(line.strip())
                if name:
                    current = name if _HOSPITAL.match(name) else None
            if current:
                pages[current] += 1
    return {"hospitals": dict(pages.most_common()), "front_text": "\n".join(front)}


def choose_hospital(hospitals: dict[str, int], file_name: str) -> str | None:
    """The hospital heading the file name points at, else the one spanning the most pages."""
    if not hospitals:
        return None
    wanted = {w for w in words(Path(file_name).stem) if len(w) >= 4 and w not in _FILE_NOISE and not w.isdigit()}
    hits = {name: len(wanted & words(name)) for name in hospitals}
    best = max(hits.values())
    if best:
        return max((n for n, h in hits.items() if h == best), key=lambda n: hospitals[n])
    return max(hospitals, key=lambda n: hospitals[n])


def _field(value, source: str) -> dict:
    return {"value": value, "source": source}


def _place_in(text: str, *, prefixed_only: bool) -> tuple[str, str, str] | None:
    """(place, province, matched text) for a regency or city the text names.

    Running text only counts a name after KABUPATEN / KOTA, as a place name can also be a
    plain word ("BATU" is a stone); a hospital's name or the file name may name it bare.
    """
    candidates = [(m.group(1).upper() + " ", m.group(2)) for m in _REGION_PREFIX.finditer(text)] if prefixed_only else [("", text)]
    for prefix, candidate in candidates:
        found = words(candidate)
        for place, province in _PLACES:
            if words(place) <= found:
                return place, province, f"{prefix}{place.upper()}"
    return None


def detect_profile(*, heading: str | None, file_name: str, rows: list[dict], front_text: str) -> dict:
    """{field: {value, source}} for what the document says about the hospital."""
    profile: dict[str, dict] = {}
    name = short_name(heading) if heading else name_from_file(file_name)
    profile["name"] = _field(name, f'Judul bagian "{heading}"' if heading else f'Nama file "{file_name}"')

    context = " ".join({t for r in rows[:200] for t in (r.get("part"), r.get("section")) if t})
    places = [("nama rumah sakit", name), ("nama file", Path(file_name).stem), ("judul bagian", context), ("halaman depan", front_text)]

    for label, text in places:
        place = _place_in(text, prefixed_only=label in ("judul bagian", "halaman depan"))
        if place:
            city, province, matched = place
            profile["city"] = _field(city, f'"{matched}" di {label}')
            profile["province"] = _field(province, f"Provinsi tempat {city} berada")
            break
    for label, text in places[2:]:
        printed = _PROVINCE.search(text)
        if printed:
            province = printed.group(1).strip().title()
            profile["province"] = _field(province, f'"Provinsi {province}" di {label}')
            break

    for label, text in places:
        match = _YEAR.search(text) or (_BARE_YEAR.search(text) if label == "nama file" else None)
        if match:
            profile["year"] = _field(int(match.group(1)), f'"{match.group(0)}" di {label}')
            break

    address = _ADDRESS.search(front_text)
    if address:
        profile["address"] = _field(address.group(0).strip(" ,."), "Halaman depan")

    for label, text in places:
        kelas = _KELAS.search(text.upper())
        if kelas:
            profile["kelas"] = _field(kelas.group(1), f'"{kelas.group(0)}" di {label}')
            break

    for pattern, ownership in ((_MILITARY, "TNI/Polri"), (_STATE_COMPANY, "BUMN"), (_PRIVATE, "Swasta"), (_GOVERNMENT, "Pemerintah")):
        hit = next(((label, m) for label, text in places if (m := pattern.search(text))), None)
        if hit:
            label, match = hit
            profile["ownership"] = _field(ownership, f'"{match.group(0)}" di {label}')
            break

    partner = next((label for label, text in places[1:] if "REKANAN" in words(text)), None)
    profile["partner"] = _field(partner is not None, f'"Rekanan" di {partner}' if partner else "Tidak disebut sebagai rekanan")
    return profile
