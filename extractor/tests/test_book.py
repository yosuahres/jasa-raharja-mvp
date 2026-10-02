"""Regression tests against the three sample tariff books in ../data.

Each book lays its tables out differently; the expected values were read off
the PDFs by hand. Skipped when the sample PDFs are not present.
"""

from pathlib import Path

import pytest

from app.book import extract_book

DATA = Path(__file__).resolve().parents[2] / "data"
UBAYA = DATA / "Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf"
SOEDONO = DATA / "1. TARIF RSUD DR SOEDONO MADIUN.pdf"
ISKAK = DATA / "Perda Nomor 1 Tahun 2025 TARIF RSUD ISKAK.pdf"


def _rows(pdf: Path, **kwargs) -> list[dict]:
    if not pdf.exists():
        pytest.skip(f"sample book not available: {pdf.name}")
    rows, _ = extract_book(pdf, **kwargs)
    return rows


def _find(rows: list[dict], name: str, **match) -> dict:
    found = [r for r in rows if r["raw_name"] == name and all(r[k] == v for k, v in match.items())]
    assert found, f"no row named {name!r}"
    return found[0]


def _prices(row: dict) -> dict[str, int | None]:
    return {p["kelas"]: p["amount"] for p in row["prices"]}


@pytest.fixture(scope="module")
def ubaya() -> list[dict]:
    return _rows(UBAYA, facility_name="RS Ubaya")


@pytest.fixture(scope="module")
def soedono() -> list[dict]:
    # Pages 4-5 carry the regulation outline; 1041 starts RSUD Dr. Soedono.
    return _rows(SOEDONO, pages=[4, 5, *range(1041, 1102)], facility="SOEDONO")


@pytest.fixture(scope="module")
def iskak() -> list[dict]:
    return _rows(ISKAK, pages=[7, 8, *range(61, 65)])


# ---------------------------------------------------------------- Ubaya: class columns


def test_room_prices_per_class(ubaya):
    row = _find(ubaya, "KAMAR PERAWATAN")
    assert _prices(row) == {
        "KELAS PERAWATAN / SUITE ROOM": 2_351_000,
        "KELAS PERAWATAN / EKSEKUTIF": 1_823_000,
        "KELAS PERAWATAN / DELUXE": 1_632_000,
        "KELAS PERAWATAN / VIP": 1_199_000,
        "KELAS PERAWATAN / I": 959_000,
        "KELAS PERAWATAN / II": 575_000,
        "KELAS PERAWATAN / III": 299_000,
    }
    assert row["section"] == "BAB 1 - BIAYA UMUM › 1.2 Tarif Ruangan"


def test_merged_price_cell_applies_to_every_class_it_spans(ubaya):
    row = _find(ubaya, "Perawatan Kelas")
    prices = _prices(row)
    assert [prices[f"KELAS PERAWATAN / {k}"] for k in ("SUITE ROOM", "EKSEKUTIF", "DELUXE")] == [150_000] * 3
    assert [prices[f"KELAS PERAWATAN / {k}"] for k in ("VIP", "I", "II", "III")] == [135_000] * 4


def test_sub_items_keep_their_parents(ubaya):
    row = _find(ubaya, "Dengan Dokter")
    assert row["parents"] == ["KAMAR BERSALIN", "Untuk Persalinan"]
    assert row["facility"] == "RS Ubaya"


def test_section_follows_numbered_headings(ubaya):
    assert _find(ubaya, "Bilas Lambung")["section"] == "BAB 2 - JASA MEDIS › 2.4 Tindakan Medis Non Operatif"


def test_text_in_a_price_column_is_kept_and_flagged(ubaya):
    row = next(r for r in ubaya if r["raw_name"].startswith("Tindakan medis di luar tindakan"))
    assert row["prices"] == [{"kelas": "TARIF", "raw_price": "50% dari JM Dokter Spesialis", "amount": None, "superseded": False}]
    assert "unparsed_price" in row["flags"]


# ---------------------------------------------------------------- Soedono: one hospital in a regulation


def test_old_and_new_tariff_columns(soedono):
    row = _find(soedono, "PASANG GIPS")
    assert row["facility"] == "RUMAH SAKIT UMUM DAERAH DR. SOEDONO"
    assert row["part"] == "LAMPIRAN › I. PENINJAUAN TARIF RETRIBUSI DAERAH › I.I RETRIBUSI JASA UMUM › A. PELAYANAN KESEHATAN"
    assert row["section"] == "I. RAWAT DARURAT"
    assert [(p["kelas"], p["amount"], p["superseded"]) for p in row["prices"]] == [
        ("TARIF LAMA", 100_000, True),
        ("TARIF BARU", 100_000, False),
    ]


def test_dashes_are_not_prices(soedono):
    row = _find(soedono, "VVIP")
    assert _prices(row) == {"TARIF LAMA / PRIVAT": 900_000, "TARIF BARU / PRIVAT": 900_000}


def test_row_split_by_a_page_break_is_joined(soedono):
    row = _find(soedono, "MUSCLE (UPPER LIMB), DEEP ABSCESS,INCISION AND DRAINAGE WITH GENERAL ANESTHESI (83.45)")
    assert row["item_no"] == "302"
    assert row["page"] == 1100
    assert "continued_across_pages" in row["flags"]
    assert _prices(row)["TARIF BARU / PRIVAT"] == 8_455_000


def test_other_hospitals_are_filtered_out(soedono):
    assert {r["facility"] for r in soedono} == {"RUMAH SAKIT UMUM DAERAH DR. SOEDONO"}


# ---------------------------------------------------------------- Iskak: hierarchy columns and group prices


def test_group_price_carries_its_members(iskak):
    row = _find(iskak, "Kelompok Bedah F")
    assert row["facility"] == "RSUD Dr. ISKAK TULUNGAGUNG"
    assert row["unit"] == "/tindakan"
    assert _prices(row) == {"TARIF / NON. PAV": 2_500_000, "TARIF / PAV": 3_250_000}
    assert "Apicoectomy With Root Canal Therapy Kecil" in row["members"]


def test_second_hospital_in_the_same_regulation(iskak):
    row = _find(iskak, "Partus Normal")
    assert row["facility"] == "RUMAH SAKIT UMUM DAERAH CAMPURDARAT"
    assert row["parents"] == ["Pelayanan Bersalin"]
    assert _prices(row) == {"TARIF / KELAS STANDART": 700_000, "TARIF / APS": 1_100_000}


def test_a_paren_list_nests_under_a_dot_list(iskak):
    rooms = [r for r in iskak if r["raw_name"] == "Kamar" and r["item_no"] == "a"]
    assert [r["parents"] for r in rooms][:2] == [["Rawat Inap", "Rawat Inap APS", "APS 1"], ["Rawat Inap", "Rawat Inap APS", "APS 2"]]
