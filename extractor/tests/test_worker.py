"""The worker against an in-memory stand-in for Supabase."""

from pathlib import Path

import pytest

from app import worker

UBAYA = Path(__file__).resolve().parents[2] / "data" / "Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf"


class FakeSupabase:
    """Just enough of PostgREST's eq. filters for the worker's calls."""

    def __init__(self, books: list[dict], files: dict[str, bytes], catalog: dict[str, list[dict]] | None = None):
        self.tables: dict[str, list[dict]] = {
            "tariff_books": books,
            "tariff_rows": [],
            "tariff_prices": [],
            "facilities": [],
            "specialties": [],
            "procedures": [],
            "injury_cases": [],
            "cities": [{"name": "Surabaya"}, {"name": "Madiun"}],
            **(catalog or {}),
        }
        self.files = files

    def _matches(self, row: dict, filters: dict[str, str]) -> bool:
        return all(str(row.get(k)) == v.removeprefix("eq.") for k, v in filters.items() if v.startswith("eq."))

    def select(self, table, params):
        filters = {k: v for k, v in params.items() if k not in {"order", "limit", "offset", "select"}}
        found = [dict(r) for r in self.tables[table] if self._matches(r, filters)]
        offset = int(params.get("offset", 0))
        return found[offset : offset + int(params.get("limit", len(found)))]

    def select_all(self, table, params):
        return self.select(table, params)

    def insert(self, table, rows, skip_duplicates_on=None):
        if skip_duplicates_on:
            taken = {r.get(skip_duplicates_on) for r in self.tables[table]}
            rows = [r for r in rows if r.get(skip_duplicates_on) not in taken]
        self.tables[table].extend(rows)

    def update(self, table, filters, values):
        hit = [r for r in self.tables[table] if self._matches(r, filters)]
        for row in hit:
            row.update(values)
        return hit

    def delete(self, table, filters):
        self.tables[table] = [r for r in self.tables[table] if not self._matches(r, filters)]

    def download(self, bucket, path):
        return self.files[path]


def _book(**overrides) -> dict:
    return {
        "id": "b1",
        "status": "queued",
        "source_file": "Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf",
        "storage_path": "rs-ubaya/b1.pdf",
        "facility_filter": None,
        **overrides,
    }


@pytest.fixture
def ubaya_bytes() -> bytes:
    if not UBAYA.exists():
        pytest.skip("sample book not available")
    return UBAYA.read_bytes()


def test_queued_book_is_extracted_and_left_for_review(ubaya_bytes):
    client = FakeSupabase([_book()], {"rs-ubaya/b1.pdf": ubaya_bytes})

    book = worker.claim_next(client)
    worker.process(client, book)

    saved = client.tables["tariff_books"][0]
    assert saved["status"] == "review"
    assert saved["pages_total"] == saved["pages_done"] == 17
    assert saved["scanned_pages"] == [1]
    rows = client.tables["tariff_rows"]
    assert len(rows) == 446
    assert [r["position"] for r in rows] == list(range(446))
    assert {r["facility"] for r in rows} == {"RS UBAYA"}
    room = next(r for r in rows if r["raw_name"] == "KAMAR PERAWATAN")
    prices = [p for p in client.tables["tariff_prices"] if p["row_id"] == room["id"]]
    assert len(prices) == 7 and prices[0]["amount"] == 2_351_000


def test_a_claimed_book_is_not_claimed_again(ubaya_bytes):
    client = FakeSupabase([_book()], {"rs-ubaya/b1.pdf": ubaya_bytes})
    assert worker.claim_next(client) is not None
    assert worker.claim_next(client) is None


def test_a_filter_that_matches_nothing_fails_with_the_reason(ubaya_bytes):
    client = FakeSupabase([_book(facility_filter="SOEDONO")], {"rs-ubaya/b1.pdf": ubaya_bytes})

    worker.process(client, worker.claim_next(client))

    saved = client.tables["tariff_books"][0]
    assert saved["status"] == "failed"
    assert "SOEDONO" in saved["error"]
    assert client.tables["tariff_rows"] == []


def test_a_retried_book_replaces_its_old_rows(ubaya_bytes):
    client = FakeSupabase([_book()], {"rs-ubaya/b1.pdf": ubaya_bytes})
    client.tables["tariff_rows"].append({"id": "old", "book_id": "b1"})

    worker.process(client, worker.claim_next(client))

    assert all(r["id"] != "old" for r in client.tables["tariff_rows"])


def test_review_carries_what_the_book_says_besides_prices(ubaya_bytes):
    catalog = {
        "facilities": [{"id": "icu", "name": "ICU", "keywords": ["ICCU", "NICU"]}, {"id": "mri", "name": "MRI", "keywords": []}],
        "specialties": [{"id": "obsgyn", "name": "Obstetri", "keywords": ["OBSGYN"]}],
    }
    client = FakeSupabase([_book()], {"rs-ubaya/b1.pdf": ubaya_bytes}, catalog)

    worker.process(client, worker.claim_next(client))

    saved = client.tables["tariff_books"][0]
    assert [d["id"] for d in saved["detected_facilities"]] == ["icu"]  # Ubaya prints no MRI tariff
    assert saved["detected_facilities"][0]["evidence"] == "Uang Muka Rawat Intensif (ICU/NICU/PICU)"
    assert [d["id"] for d in saved["detected_specialties"]] == ["obsgyn"]
    profile = saved["detected_profile"]
    assert saved["detected_name"] == profile["name"]["value"] == "RS UBAYA"
    assert profile["year"]["value"] == 2025
    assert profile["ownership"]["value"] == "Swasta"
    assert profile["partner"]["value"] is True  # "Rekanan" in the file name
    assert "city" not in profile  # Ubaya doesn't print its city; the preview asks for it


def test_every_row_is_kept_with_a_category(ubaya_bytes):
    client = FakeSupabase([_book()], {"rs-ubaya/b1.pdf": ubaya_bytes})

    worker.process(client, worker.claim_next(client))

    rows = client.tables["tariff_rows"]
    assert len(rows) == 446 and all(r["category"] for r in rows)
    icu = next(r for r in rows if r["raw_name"] == "INTENSIVE CARE UNIT (ICU/ICCU/PICU/NICU)")
    assert icu["category"] == "kamar"
