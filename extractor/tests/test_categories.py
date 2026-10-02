from app.categories import classify


def _row(name: str, section: str = "", parents: list[str] | None = None) -> dict:
    return {"raw_name": name, "section": section, "parents": parents or []}


def test_the_name_decides_first():
    assert classify(_row("CT. SCAN KEPALA 3D", "I. RAWAT DARURAT")) == "radiologi"
    assert classify(_row("DARAH LENGKAP RUTIN")) == "laboratorium"
    assert classify(_row("BRAIN, EPIDURAL HEMORRHAGE (EDH), CRANIOTOMY & EVACUATION (01.24)")) == "operatif"
    assert classify(_row("Kamar", parents=["Rawat Inap Kelas II"])) == "kamar"


def test_then_the_closest_heading():
    assert classify(_row("PASANG GIPS", "I. RAWAT DARURAT")) == "tindakan"
    assert classify(_row("PERSALINAN ABORTUS", "I. RAWAT DARURAT")) == "igd"
    assert classify(_row("FEMUR. SHAFT FRACTURE (79.35)", "A. OPERATIF › 4) BEDAH ORTHOPEDI")) == "operatif"
    assert classify(_row("Thorax AP", "15. PELAYANAN RADIOLOGI")) == "radiologi"
    assert classify(_row("KUMBAH LAMBUNG", "II. RAWAT INAP › B. RAWAT INAP REGULER")) == "tindakan"


def test_nothing_to_go_on_is_lainnya():
    assert classify(_row("Tes MMPI 2", "Psikiatri")) == "lainnya"
