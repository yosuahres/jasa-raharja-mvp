from app.treatments import treatment_key, treatments


def _row(name: str, parents: list[str] | None = None, members: list[str] | None = None) -> dict:
    return {"raw_name": name, "parents": parents or [], "members": members or []}


def test_one_tindakan_spelled_many_ways_has_one_key():
    # As RSUD Iskak, RSUD Soedono and RS Ubaya print them.
    assert treatment_key("Necrotomy") == treatment_key("NECROTOMI") == treatment_key("Nekrotomi")
    assert treatment_key("Pasang Catheter") == treatment_key("PEMASANGAN KATETER") == treatment_key("Pemasangan Kateter")
    assert treatment_key("Echocardiography") == treatment_key("ECHOCARDIOGRAPHY") == treatment_key("Ekokardiografi")
    assert treatment_key("Phlebotomy") == treatment_key("PHLEBOTOMI")
    assert treatment_key("Manual Plasenta") == treatment_key("PLACENTA MANUAL")
    assert treatment_key("Repair Tendon") == treatment_key("TENDON REPAIR")
    assert treatment_key("Craniotomy") == treatment_key("Kraniotomi")
    assert treatment_key("APPENDECTOMY") == treatment_key("Apendektomi")


def test_codes_size_and_anaesthesia_only_make_a_variant():
    assert treatment_key("VERTEBROPLASTY (81.65)") == treatment_key("Vertebroplasty")
    assert treatment_key("Debridement kecil") == treatment_key("DEBRIDEMENT") == treatment_key("Debridement besar")
    assert treatment_key("Circumsisi dengan GA(General Anaesthesia )") == treatment_key("Sirkumsisi")
    assert treatment_key("Odontektomy dengan GA") == treatment_key("ODONTECTOMI RINGAN")


def test_a_more_specific_tindakan_stays_its_own():
    assert treatment_key("Repair tendon patella") != treatment_key("TENDON REPAIR")
    assert treatment_key("Insisi absces perineum") != treatment_key("INSISI ABSES")


def test_only_tindakan_rows_name_one():
    assert treatments(_row("PEMASANGAN INFUS"), "kamar") == []
    assert treatments(_row("PEMASANGAN INFUS"), "tindakan") == [{"name": "PEMASANGAN INFUS", "key": "INFUS PASANG"}]


def test_a_group_price_names_each_of_its_members():
    row = _row("Besar A", members=["Amputasi forequarter", "Amputasi hindquarter", "Amputasi forequarter"])
    assert [t["name"] for t in treatments(row, "operatif")] == ["Amputasi forequarter", "Amputasi hindquarter"]


def test_a_variant_or_group_code_takes_its_heading():
    assert treatments(_row("Ringan", ["Debridement"]), "tindakan") == [{"name": "Debridement — Ringan", "key": "DEBRIDEMEN"}]
    craniotomy = treatments(_row("Bedah Syaraf H", ["0", "Craniotomi/Trepanasi Trauma + Ventrikulostomi"]), "operatif")
    assert [t["name"] for t in craniotomy] == ["Craniotomi/Trepanasi Trauma + Ventrikulostomi"]
    assert treatments(_row("Kecil", ["KAMAR OPERASI"]), "operatif") == [{"name": "KAMAR OPERASI — Kecil", "key": "KAMAR"}]


def test_a_row_with_nothing_but_a_size_names_nothing():
    assert treatments(_row("Kecil"), "operatif") == []
    assert treatments(_row("Kelompok 4"), "tindakan") == []


def test_list_markers_and_codes_are_left_out_of_the_name():
    assert treatments(_row("jj. Repair Tendon"), "operatif")[0]["name"] == "Repair Tendon"
    assert treatments(_row("VERTEBROPLASTY (81.65)"), "operatif")[0]["name"] == "VERTEBROPLASTY"
