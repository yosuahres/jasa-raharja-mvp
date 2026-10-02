"""Extract tariff books uploaded from the dashboard.

    python -m app.worker            # keep polling for queued books
    python -m app.worker --once     # process what is queued, then stop

Picks up books with status 'queued', downloads the PDF from Storage, finds which
hospital it is about, extracts all of that hospital's rows, files each under a
category, reads the hospital's profile, and leaves the book in 'review' for the
dashboard's preview. A book that yields nothing ends as 'failed' with the reason.
"""

import argparse
import logging
import tempfile
import time
import uuid
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import pymupdf

from app import catalog
from app.book import extract_book
from app.masterdata import detect
from app.categories import classify
from app.profile import choose_hospital, detect_profile, prescan, short_name
from app.supabase import Supabase, SupabaseError

log = logging.getLogger("worker")

BUCKET = "tariff-books"
ROW_BATCH = 500
PRICE_BATCH = 2000
# Report pages read at most this often, so a big book doesn't flood the database.
PROGRESS_SECONDS = 2.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract tariff books queued from the dashboard.")
    parser.add_argument("--once", action="store_true", help="Process the queue once, then exit.")
    parser.add_argument("--interval", type=float, default=5.0, help="Seconds between queue checks.")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    client = Supabase.from_env()
    sync_catalog(client)
    requeue_interrupted(client)
    log.info("waiting for tariff books")
    while True:
        try:
            book = claim_next(client)
        except (SupabaseError, OSError) as error:  # a dropped connection shouldn't stop the worker
            log.warning("queue check failed, retrying: %s", error)
            time.sleep(args.interval)
            continue
        if book:
            process(client, book)
            continue
        if args.once:
            return
        time.sleep(args.interval)


def sync_catalog(client: Supabase) -> None:
    """Write the facilities and specialists to detect (catalog.py) to the database, replacing what was there."""
    tables = {
        "specialties": [{"id": i, "name": n, "keywords": k} for i, n, k in catalog.SPECIALTIES],
        "facilities": [{"id": i, "name": n, "category": c, "keywords": k} for i, n, c, k in catalog.FACILITIES],
    }
    for table, rows in tables.items():
        client.upsert(table, rows, on_conflict="id")
        ids = ",".join(f'"{r["id"]}"' for r in rows)
        client.delete(table, {"id": f"not.in.({ids})"})
    log.info("catalog synced: %d facilities, %d specialists", len(catalog.FACILITIES), len(catalog.SPECIALTIES))


def requeue_interrupted(client: Supabase) -> None:
    """Books left 'extracting' by a worker that stopped mid-way. Assumes one worker runs at a time."""
    for book in client.update("tariff_books", {"status": "eq.extracting"}, {"status": "queued", "pages_done": 0}):
        log.info("requeued interrupted book %s", book["id"])


def claim_next(client: Supabase) -> dict | None:
    queued = client.select(
        "tariff_books",
        {"status": "eq.queued", "order": "created_at.asc", "limit": "1", "select": "*"},
    )
    if not queued:
        return None
    book = queued[0]
    # Only one claimant flips queued → extracting.
    claimed = client.update(
        "tariff_books",
        {"id": f"eq.{book['id']}", "status": "eq.queued"},
        {"status": "extracting", "error": None, "pages_done": 0},
    )
    return book if claimed else None


def process(client: Supabase, book: dict) -> None:
    book_id = book["id"]
    log.info("extracting %s (%s)", book["source_file"], book_id)
    try:
        with tempfile.TemporaryDirectory() as folder:
            pdf = Path(folder) / "book.pdf"
            pdf.write_bytes(client.download(BUCKET, book["storage_path"]))
            with pymupdf.open(pdf) as doc:
                total = doc.page_count
            set_book(client, book_id, {"pages_total": total})

            scan = prescan(pdf)
            hospitals = scan["hospitals"]
            # A person picked a hospital in the preview, or the document holds several: extract only that one.
            heading = book.get("facility_filter") or choose_hospital(hospitals, book["source_file"])
            facility_filter = heading if len(hospitals) > 1 or book.get("facility_filter") else None

            last_report = 0.0

            def progress(stat: dict) -> None:
                nonlocal last_report
                if time.monotonic() - last_report >= PROGRESS_SECONDS:
                    set_book(client, book_id, {"pages_done": stat["number"]})
                    last_report = time.monotonic()

            rows, stats = extract_book(
                pdf, facility=facility_filter, facility_name=None if facility_filter else heading, on_page=progress
            )

        scanned = [s["number"] for s in stats if s["status"] == "no_text"]
        if not rows:
            raise ValueError(nothing_found(facility_filter, scanned, total))

        categories = [classify(row) for row in rows]
        save_rows(client, book_id, rows, categories)
        profile = detect_profile(
            heading=heading,
            file_name=book["source_file"],
            rows=rows,
            front_text=scan["front_text"],
        )
        set_book(
            client,
            book_id,
            {
                "status": "review",
                "pages_done": total,
                "scanned_pages": scanned,
                "extracted_at": datetime.now(UTC).isoformat(),
                "facility_filter": facility_filter,
                "detected_name": profile["name"]["value"],
                "detected_profile": profile,
                "category_counts": dict(Counter(categories)),
                "document_hospitals": [{"heading": h, "name": short_name(h), "pages": n} for h, n in hospitals.items()],
                "detected_facilities": detect(rows, client.select_all("facilities", {"select": "id,name,keywords"})),
                "detected_specialties": detect(rows, client.select_all("specialties", {"select": "id,name,keywords"})),
            },
        )
        log.info("done %s: %d rows, %d scanned pages", book_id, len(rows), len(scanned))
    except Exception as error:  # the dashboard shows the reason; the worker keeps going
        log.exception("failed %s", book_id)
        set_book(client, book_id, {"status": "failed", "error": str(error)[:1000]})


def nothing_found(facility_filter: str | None, scanned: list[int], total: int) -> str:
    if facility_filter:
        return f'Tidak ada baris tarif untuk "{facility_filter}" di dokumen ini.'
    if len(scanned) == total:
        return "Semua halaman hasil scan (tanpa teks), jadi tidak ada yang bisa dibaca."
    return "Tidak ada tabel tarif bergaris yang ditemukan di PDF ini."


def save_rows(client: Supabase, book_id: str, rows: list[dict], categories: list[str] | None = None) -> None:
    """Replace the book's rows (a retried book may have some from an earlier run)."""
    client.delete("tariff_rows", {"book_id": f"eq.{book_id}"})
    row_payload, price_payload = to_db_rows(book_id, rows, categories)
    for start in range(0, len(row_payload), ROW_BATCH):
        client.insert("tariff_rows", row_payload[start : start + ROW_BATCH])
    for start in range(0, len(price_payload), PRICE_BATCH):
        client.insert("tariff_prices", price_payload[start : start + PRICE_BATCH])


def to_db_rows(book_id: str, rows: list[dict], categories: list[str] | None = None) -> tuple[list[dict], list[dict]]:
    """Extractor rows as tariff_rows and tariff_prices records, in book order, each with its category."""
    categories = categories or [classify(row) for row in rows]
    row_payload, price_payload = [], []
    for position, row in enumerate(rows):
        row_id = str(uuid.uuid4())
        row_payload.append(
            {
                "id": row_id,
                "book_id": book_id,
                "position": position,
                "page": row["page"],
                "facility": row["facility"],
                "part": row["part"],
                "section": row["section"],
                "parents": row["parents"],
                "item_no": row["item_no"],
                "raw_name": row["raw_name"],
                "unit": row["unit"],
                "members": row["members"],
                "flags": row["flags"],
                "category": categories[position],
            }
        )
        price_payload.extend(
            {
                "row_id": row_id,
                "kelas": price["kelas"],
                "raw_price": price["raw_price"],
                "amount": price["amount"],
                "superseded": price["superseded"],
            }
            for price in row["prices"]
        )
    return row_payload, price_payload


def set_book(client: Supabase, book_id: str, values: dict) -> None:
    client.update("tariff_books", {"id": f"eq.{book_id}"}, values)


if __name__ == "__main__":
    main()
