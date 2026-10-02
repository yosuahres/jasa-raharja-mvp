"""What the system looks for in a tariff document. Part of the system, not data: every value about a
hospital comes from its document; these say which facilities and specialists to recognise in its
rows and how documents write them, and which place names to recognise in its text.

The worker writes the facilities and specialists to the database when it starts (see sync_catalog
in worker.py), so the dashboard shows the same names. Edit here, then restart the worker.
"""

SPECIALTIES = [
    ("ortopedi", "Ortopedi & Traumatologi", ["ORTOPEDI", "ORTHOPEDI", "ORTHOPAEDI", "ORTOPAEDI"]),
    ("bedah-saraf", "Bedah Saraf", ["BEDAH SARAF", "BEDAH SYARAF", "NEUROSURGERY", "KRANIOTOMI", "CRANIOTOMY"]),
    ("bedah-umum", "Bedah Umum", ["BEDAH UMUM"]),
    ("anestesi", "Anestesiologi", ["ANESTESI", "ANESTHESI", "ANASTESI", "ANASTHESI", "ANESTESIOLOGI"]),
    ("saraf", "Neurologi", ["NEUROLOGI", "SARAF", "SYARAF"]),
    ("radiologi", "Radiologi", ["RADIOLOGI"]),
    ("emergensi", "Kedokteran Emergensi", ["KEDOKTERAN EMERGENSI", "EMERGENCY MEDICINE", "EMERGENSI"]),
]

FACILITIES = [
    ("igd", "IGD", "gawat-darurat", ["IGD", "UGD", "GAWAT DARURAT", "RAWAT DARURAT"]),
    ("ambulans", "Ambulans", "transport", ["AMBULANCE", "AMBULAN"]),
    ("ok", "Kamar Operasi (OK)", "operasi", ["KAMAR OPERASI", "OPERASI", "OPERATIF"]),
    ("c-arm", "C-Arm", "operasi", ["C-ARM", "CARM", "C ARM"]),
    ("icu", "ICU", "rawat", ["ICU", "ICCU", "PICU", "NICU", "INTENSIVE CARE"]),
    ("hcu", "HCU", "rawat", ["HCU", "HIGH CARE", "IMCU"]),
    ("rontgen", "Rontgen", "radiologi", ["RONTGEN", "X-RAY", "XRAY", "RADIOGRAFI"]),
    ("ct-scan", "CT Scan", "radiologi", ["CT SCAN", "CT-SCAN", "MSCT"]),
    ("mri", "MRI", "radiologi", ["MRI"]),
    ("lab", "Laboratorium", "penunjang", ["LABORATORIUM", "PATOLOGI KLINIK", "HEMATOLOGI"]),
    ("bank-darah", "Bank Darah", "penunjang", ["BANK DARAH", "TRANSFUSI", "KOMPONEN DARAH"]),
]

# Regency and city names, to recognise a place a document prints ("MADIUN", "KABUPATEN TULUNGAGUNG"),
# with the province each lies in. Names only: where a hospital is comes from its document.
REGIONS = {
    "Jawa Timur": [
        "Bangkalan", "Banyuwangi", "Batu", "Blitar", "Bojonegoro", "Bondowoso", "Gresik", "Jember", "Jombang", "Kediri",
        "Lamongan", "Lumajang", "Madiun", "Magetan", "Malang", "Mojokerto", "Nganjuk", "Ngawi", "Pacitan", "Pamekasan",
        "Pasuruan", "Ponorogo", "Probolinggo", "Sampang", "Sidoarjo", "Situbondo", "Sumenep", "Surabaya", "Trenggalek",
        "Tuban", "Tulungagung",
    ],
    "DKI Jakarta": ["Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur"],
    "Jawa Barat": ["Bandung", "Bekasi", "Bogor", "Cimahi", "Cirebon", "Depok", "Sukabumi", "Tasikmalaya", "Karawang", "Garut"],
    "Banten": ["Tangerang", "Tangerang Selatan", "Serang", "Cilegon"],
    "Jawa Tengah": ["Semarang", "Surakarta", "Solo", "Magelang", "Pekalongan", "Tegal", "Salatiga", "Purwokerto", "Kudus"],
    "DI Yogyakarta": ["Yogyakarta", "Sleman", "Bantul"],
    "Bali": ["Denpasar", "Badung", "Gianyar"],
    "Sumatera Utara": ["Medan"],
    "Sumatera Barat": ["Padang"],
    "Sumatera Selatan": ["Palembang"],
    "Riau": ["Pekanbaru"],
    "Lampung": ["Bandar Lampung"],
    "Kalimantan Timur": ["Balikpapan", "Samarinda"],
    "Kalimantan Selatan": ["Banjarmasin"],
    "Kalimantan Barat": ["Pontianak"],
    "Sulawesi Selatan": ["Makassar"],
    "Sulawesi Utara": ["Manado"],
}
