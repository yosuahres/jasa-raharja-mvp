"""Which kind of service each tariff row is: every row is kept and filed under one category.

A row's own name decides first ("CT SCAN KEPALA" is radiology wherever it is listed); a name
that says nothing specific falls back to the headings it sits under, innermost first, so
"PASANG GIPS" under "I. RAWAT DARURAT" is an emergency service and "FEMUR. FRACTURE. ORIF"
under "BEDAH ORTHOPEDI" is surgery. Rows under a care setting ("RAWAT JALAN", "RAWAT INAP") that nothing closer names
are procedures done there. A row neither decides is "lainnya".
"""

import re

# (id, label, pattern on the row's name, pattern on its headings), in order of precedence.
CATEGORIES: list[tuple[str, str, str | None, str | None]] = [
    ("obat", "Obat & bahan habis pakai",
     r"^(OBAT|PELAYANAN OBAT|PEMAKAIAN (O2|OKSIGEN)|BAHAN HABIS PAKAI|BHP|ALKES)\b|\bFARMASI\b", r"\b(FARMASI|BAHAN HABIS PAKAI|BHP)\b"),
    ("laboratorium", "Laboratorium",
     r"\b(LABORATORIUM|DARAH LENGKAP|DARAH RUTIN|HEMATOLOGI|URIN(E|ALISA)?|FESES|KULTUR|GULA DARAH|ELEKTROLIT|SEROLOGI|IMUNOLOGI|HBSAG|HIV|PCR|CROSSMATCH|GOLONGAN DARAH)\b",
     r"\b(LABORATORIUM|PATOLOGI|HEMATOLOGI|KIMIA KLINIK|MIKROBIOLOGI|BANK DARAH)\b"),
    ("radiologi", "Radiologi",
     r"\b(RADIOLOGI|RONTGEN|CT\.? ?SCAN|MSCT|MRI|USG|ULTRASONOGRAFI|X-?RAY|FOTO|MAMMOGRAFI|FLUOROSKOPI|BNO|IVP|PANORAMIC)\b",
     r"\b(RADIOLOGI|RADIODIAGNOSTIK|PENCITRAAN|IMAGING)\b"),
    ("kamar", "Kamar & rawat inap",
     r"^(KAMAR|RUANG|KELAS (I{1,3}|[123]|UTAMA)|VIP|VVIP|SUITE|ICU|ICCU|HCU|NICU|PICU|ISOLASI|INTENSIVE CARE|PERAWATAN DASAR)\b|\bAKOMODASI\b",
     r"\b(AKOMODASI|TARIF RUANGAN|KAMAR PERAWATAN|RUANG PERAWATAN|SEWA KAMAR)\b"),
    ("rehabilitasi", "Rehabilitasi medik", r"\b(FISIOTERAPI|TERAPI WICARA|OKUPASI|REHABILITASI)\b", r"\b(REHABILITASI|FISIOTERAPI|REHAB MEDIK)\b"),
    ("konsultasi", "Konsultasi & visite", r"\b(VISITE|KONSULTASI|KONSUL|PEMERIKSAAN DOKTER|JASA DOKTER)\b", None),
    ("operatif", "Tindakan operatif",
     r"\b(ORIF|OREF|OPERASI|BEDAH|CRANIOTOMY|KRANIOTOMI|LAPAROTOMI|LAPAROSCOP\w*|APPENDECTOMY|APENDEKTOMI|AMPUTA\w*|EXCISION|EKSISI|GENERAL ANEST\w*|SECTIO|SC)\b|\w+(ECTOMY|EKTOMI|OTOMY|OTOMI|PLASTY|PLASTI)\b",
     r"\b(OPERATIF|OPERASI|BEDAH|KAMAR OPERASI|OK|ANESTESI)\b"),
    ("igd", "Gawat darurat (IGD)", r"\b(IGD|UGD|GAWAT DARURAT|TRIASE)\b", r"\b(IGD|UGD|GAWAT DARURAT|RAWAT DARURAT|EMERGENCY)\b"),
    ("tindakan", "Tindakan non-operatif",
     r"\b(TINDAKAN|PEMASANGAN|PASANG|GIPS|HECTING|HEACTING|JAHIT|INJEKSI|INFUS|NEBUL\w*|KATETER\w*|HEMODIALISA|ENDOSKOPI|"
     r"BRONKOSKOPI|BRONCHOSCOP\w*|KOLONOSKOPI|GASTROSKOPI|LARINGOSKOP\w*|KEMOTERAPI|EKG|EEG|EMG|ECHOCARDIOGRAPHY|PERAWATAN LUKA|"
     r"REPOSISI|ASUHAN KEPERAWATAN|PACEMAKER|PROCEDURES?)\b",
     # Rows under a care setting that no closer heading names are procedures done there.
     r"\b(TINDAKAN|NON OPERATIF|KEPERAWATAN|HEMODIALISA|ENDOSKOPI|RAWAT JALAN|RAWAT INAP|ESTETIKA|INTERVENSI|EEG|PALIATIF)\b"),
    ("administrasi", "Administrasi", r"\b(ADMINISTRASI|KARCIS|PENDAFTARAN|REKAM MEDIS|SURAT|LEGALISIR|KARTU)\b", r"\b(ADMINISTRASI)\b"),
]

LAINNYA = ("lainnya", "Lainnya")

_COMPILED = [(cid, re.compile(n, re.I) if n else None, re.compile(c, re.I) if c else None) for cid, _, n, c in CATEGORIES]


def classify(row: dict) -> str:
    name = row["raw_name"]
    for cid, name_pattern, _ in _COMPILED:
        if name_pattern and name_pattern.search(name):
            return cid
    headings = [*reversed(row.get("parents") or []), *reversed((row.get("section") or "").split(" › "))]
    for heading in headings:
        for cid, _, context_pattern in _COMPILED:
            if context_pattern and context_pattern.search(heading):
                return cid
    return LAINNYA[0]
