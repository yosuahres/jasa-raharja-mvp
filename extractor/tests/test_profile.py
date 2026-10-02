from app.profile import choose_hospital, detect_profile, name_from_file, short_name

def test_the_file_name_picks_the_hospital_out_of_a_regulation():
    hospitals = {"RUMAH SAKIT UMUM DAERAH DR. SOETOMO": 809, "RUMAH SAKIT UMUM DAERAH DR. SOEDONO": 374}
    assert choose_hospital(hospitals, "1. TARIF RSUD DR SOEDONO MADIUN.pdf") == "RUMAH SAKIT UMUM DAERAH DR. SOEDONO"
    # Nothing in the name: the hospital with the most pages.
    assert choose_hospital(hospitals, "Pergub Jatim 2025.pdf") == "RUMAH SAKIT UMUM DAERAH DR. SOETOMO"
    assert choose_hospital({}, "x.pdf") is None


def test_names():
    assert short_name("RUMAH SAKIT UMUM DAERAH DR. SOEDONO") == "RSUD DR. SOEDONO"
    assert name_from_file("Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf") == "RS Ubaya"


def test_profile_fields_carry_their_source_and_skip_what_is_not_printed():
    profile = detect_profile(
        heading="RUMAH SAKIT UMUM DAERAH DR. SOEDONO",
        file_name="1. TARIF RSUD DR SOEDONO MADIUN.pdf",
        rows=[{"part": "PERATURAN GUBERNUR JAWA TIMUR NOMOR 12 TAHUN 2025", "section": None}],
        front_text="",
    )

    assert profile["name"]["value"] == "RSUD DR. SOEDONO"
    assert profile["city"]["value"] == "Madiun"  # bare in the file name
    assert profile["province"]["value"] == "Jawa Timur"
    assert profile["year"]["value"] == 2025
    assert profile["ownership"]["value"] == "Pemerintah"
    assert profile["partner"]["value"] is False
    assert "kelas" not in profile and "address" not in profile


def test_running_text_only_counts_a_place_after_kabupaten_or_kota():
    def city(front_text: str):
        profile = detect_profile(heading="RS X", file_name="x.pdf", rows=[], front_text=front_text)
        return profile.get("city", {}).get("value")

    assert city("PERATURAN DAERAH KABUPATEN TULUNGAGUNG NOMOR 1") == "Tulungagung"
    assert city("TINDAKAN ESWL BATU GINJAL") is None
