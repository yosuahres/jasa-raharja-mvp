"""Which tindakan each tariff row prices, named so the same tindakan matches across documents.

Documents print one tindakan many ways: "Necrotomi", "NECROTOMY" and "Nekrotomi"; "Pasang Catheter"
and "PEMASANGAN KATETER"; "Debridement kecil" and "Debridement" › "Ringan". Each tindakan a row
prices gets its name as printed and a key: the words that say what is done, spelled the Indonesian
way, without ICD-9 codes, filler words, word order, or the size and anaesthesia that only make it a
variant. Rows of different hospitals with the same key are the same tindakan, and Cari Rujukan
compares their prices.

Only tindakan rows (operatif and non-operatif) get one. A row's tindakan is the most specific name
it has: each of its members when a group price lists them ("Besar A": "Amputasi forequarter", ...),
else its own name, else the closest heading when its own name is only a variant or a group code
("Debridement" › "Ringan" is "Debridement — Ringan", keyed as Debridement).
"""

import re

# Bump when the rules below change: the worker then names the tindakan of every stored document again.
TREATMENTS_VERSION = 1

TINDAKAN_CATEGORIES = {"operatif", "tindakan"}

# A name for a group price rather than a tindakan: "Kelompok 3", "Bedah Syaraf H", "Operasi Gol II".
_GROUP_CODE = re.compile(
    r"^((KELOMPOK|GOLONGAN|GOL)\b.*|(TINDAKAN|PELAYANAN|BEDAH|NEURO|INTERVENSI|OPERASI)\b.*(\s[A-Z]|\s\d+|\s[IV]+|KECIL|SEDANG|BESAR|KHUSUS))$",
    re.I,
)
# A room or service class the row is priced in: "Kelas II", "VIP", "Eksekutif".
_ROOM_CLASS = re.compile(r"^(KELAS\b.*|VIP|VVIP|SUITE ROOM|SUITE|EKSEKUTIF|DELUXE|REGULER|PRIVAT|PRESIDENT SUITE|I{1,3}|IV|V)$", re.I)
# A list marker the extractor kept on the name: "jj. Repair Tendon", "a) ...", "1. ...".
_LIST_MARKER = re.compile(r"^([a-z]{1,3}|\d{1,3})[.)]\s+", re.I)
_CODE = re.compile(r"\(\s*[\d.\s,/-]+\)")  # an ICD-9 code: "(01.24)", "(04.2 )"

# Words that don't tell one tindakan from another.
_FILLER = {
    "DAN", "ATAU", "DENGAN", "DG", "DGN", "TANPA", "DI", "PADA", "YANG", "UNTUK", "PER", "KE", "DARI", "SETIAP", "SAMPAI",
    "AND", "OR", "WITH", "WITHOUT", "OF", "THE", "IN", "ON", "FOR", "BY", "TO", "AN", "W", "WO", "VIA",
    "TINDAKAN", "PELAYANAN", "OPERASI", "PROSEDUR", "PROCEDURE", "PROCEDURES", "MELAKUKAN", "TARIF", "JASA",
}

# Words that make a tindakan a variant, not another tindakan: its size, difficulty or anaesthesia.
# Spelled as the key spells them.
_VARIANT = {
    "KESIL", "SEDANG", "BESAR", "KUSUS", "RINGAN", "BERAT", "SEDERHANA", "SIMPLE", "SIMPEL", "MUDAH", "SULIT",
    "KOMPLEK", "KOMPLEKS", "KOMPLIKATED", "KOMPLIKASI", "PENIULIT", "SMAL", "MEDIUM", "LARGE", "MAJOR", "MINOR",
    "ANESTESI", "UMUM", "LOKAL", "SEDASI", "SPINAL", "REGIONAL", "BLOK", "TOPIKAL",
}

# Spellings that the sound rules below don't bring together, as the key spells them.
_WORDS = {
    "HEACTING": "HEKTING", "HECHTING": "HEKTING", "HECTING": "HEKTING", "HEATING": "HEKTING",
    "ANASTESI": "ANESTESI", "ANESTHESI": "ANESTESI", "ANESTHESIA": "ANESTESI", "ANAESTHESIA": "ANESTESI",
    "ANESTESIA": "ANESTESI", "ANASTESIA": "ANESTESI", "ANESTHESIE": "ANESTESI",
    "GA": "ANESTESI UMUM", "LA": "ANESTESI LOKAL", "GENERAL": "UMUM", "LOCAL": "LOKAL",
    "PEMASANGAN": "PASANG", "INSERTION": "PASANG", "INSERSI": "PASANG", "INSERT": "PASANG",
    "PENGANGKATAN": "ANGKAT", "REMOVAL": "ANGKAT", "AFF": "ANGKAT", "PELEPASAN": "ANGKAT", "LEPAS": "ANGKAT",
    "PENJAHITAN": "JAHIT", "JAHITAN": "JAHIT", "SUTURE": "JAHIT", "SUTURING": "JAHIT",
    "PERAWATAN": "RAWAT", "PENGAMBILAN": "AMBIL", "PEMBERIAN": "BERI", "PENGGANTIAN": "GANTI",
    "PEMERIKSAAN": "PERIKSA", "PENCABUTAN": "CABUT", "PEMBERSIHAN": "BERSIH", "PEMOTONGAN": "POTONG",
    "WOUND": "LUKA", "VULNUS": "LUKA", "FRACTURE": "FRAKTUR", "FRACTURES": "FRAKTUR",
    "REPAIR": "REPARASI", "REPAIRS": "REPARASI", "BIOPSY": "BIOPSI", "OPEN": "TERBUKA", "CLOSED": "TERTUTUP",
    "TRACTION": "TRAKSI", "COMPLICATED": "KOMPLIKATED", "SMALL": "SMAL",
}

# Sound rules turning English and Latin spellings into Indonesian ones, in order.
_SPELLING = [
    (r"PH", "F"), (r"TH", "T"), (r"CH", "K"), (r"QU", "KW"), (r"Q", "K"), (r"X", "KS"),
    (r"Y", "I"), (r"C(?=[EI])", "S"), (r"C", "K"), (r"OE", "U"), (r"AE", "E"),
    (r"([A-Z])\1+", r"\1"),
    (r"TION$", "SI"), (r"SION$", "SI"), (r"TIE$", "TI"), (r"URE$", "UR"), (r"MENT$", "MEN"), (r"IA$", "I"),
]
_SPELLING_COMPILED = [(re.compile(p), r) for p, r in _SPELLING]


def clean_name(name: str) -> str:
    """A name as printed, tidied for display: single spaces, no list marker, ICD-9 code or trailing punctuation."""
    name = re.sub(r"\s+", " ", _CODE.sub("", name)).strip(" :;,.-")
    return _LIST_MARKER.sub("", name)


def _spell(word: str) -> str:
    for pattern, replacement in _SPELLING_COMPILED:
        word = pattern.sub(replacement, word)
    return word


def _key_words(name: str) -> set[str]:
    words = set()
    for word in re.findall(r"[A-Z]+|\d+", _CODE.sub(" ", name.upper())):
        for part in _WORDS.get(word, word).split():
            if part in _FILLER:
                continue
            spelled = _spell(part)
            if spelled and spelled not in _FILLER:
                words.add(spelled)
    return words


def treatment_key(name: str) -> str:
    """What a tindakan is, as sorted words spelled the Indonesian way: equal keys are the same tindakan."""
    return " ".join(sorted(w for w in _key_words(name) if w not in _VARIANT and not w.isdigit()))


def _names_a_treatment(name: str) -> bool:
    """Whether a name says what is done, rather than only a variant, a group code or a room class."""
    return bool(treatment_key(name)) and not (_GROUP_CODE.match(name) or _ROOM_CLASS.match(name))


def treatments(row: dict, category: str) -> list[dict]:
    """The tindakan a row prices, as {name, key}; none for a row that isn't a tindakan."""
    if category not in TINDAKAN_CATEGORIES:
        return []
    if row.get("members"):
        names = [clean_name(m) for m in row["members"]]
        return [{"name": n, "key": treatment_key(n)} for n in dict.fromkeys(names) if _names_a_treatment(n)]
    name = clean_name(row["raw_name"])
    if _names_a_treatment(name):
        return [{"name": name, "key": treatment_key(name)}]
    heading = next((h for h in (clean_name(p) for p in reversed(row.get("parents") or [])) if _names_a_treatment(h)), None)
    if heading is None:
        return []
    # Its own name is a variant of the heading's tindakan ("Ringan"), or a group code, which says nothing to a reader.
    variant = name if name and not _GROUP_CODE.match(name) else None
    return [{"name": f"{heading} — {variant}" if variant else heading, "key": treatment_key(heading)}]
