"""Extract a tariff book PDF from the command line.

    python -m app.cli BOOK.pdf --out rows.json [--csv rows.csv] [--review review.csv]
        [--facility SOEDONO] [--facility-name "RS Ubaya"] [--pages 1000-1100]

Nothing unclear is guessed: rows and pages the extractor could not read with
certainty go to the review file (default: next to --out, ending in _review.csv).
"""

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

from app.book import extract_book

CSV_FIELDS = [
    "facility", "page", "section", "parents", "item_no", "raw_name", "members", "unit",
    "kelas", "raw_price", "amount", "superseded", "flags",
]
REVIEW_FIELDS = ["page", "problem", "facility", "section", "item_no", "raw_name"]
_PROBLEMS = {
    "continued_across_pages": "Name was joined across a page break; check it against the PDF",
    "unlabelled_columns": "Table has no header row; its columns are named 'Kolom N'",
}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Extract tariff rows from a hospital tariff book PDF.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, help="Write rows as JSON here (default: stdout).")
    parser.add_argument("--csv", type=Path, help="Also write one line per price, for spreadsheets.")
    parser.add_argument("--review", type=Path, help="Where to list unclear rows and unread pages.")
    parser.add_argument("--facility", help='Keep one facility from a multi-hospital regulation, e.g. "SOEDONO".')
    parser.add_argument("--facility-name", help="Facility to record when the book never names itself in text.")
    parser.add_argument("--pages", type=_page_range, help="1-based page range, e.g. 1036-1100.")
    args = parser.parse_args(argv)

    def progress(stat: dict) -> None:
        if stat["number"] % 100 == 0:
            print(f"  page {stat['number']}", file=sys.stderr)

    rows, stats = extract_book(
        args.pdf, facility=args.facility, pages=args.pages, on_page=progress, facility_name=args.facility_name
    )

    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    if args.out:
        args.out.write_text(payload)
    else:
        print(payload)
    if args.csv:
        write_csv(rows, args.csv)

    problems = review_items(rows, stats)
    review_path = args.review or _beside(args.out or args.csv, "_review.csv")
    if review_path:
        write_review(problems, review_path)
    print_summary(rows, stats)
    print_review(problems, review_path)


def review_items(rows: list[dict], stats: list[dict]) -> list[dict]:
    """Everything the extractor could not read with certainty, for a person to check."""
    items = [
        {"page": s["number"], "problem": "Page is a scan with no text layer; nothing was extracted"}
        for s in stats
        if s["status"] == "no_text"
    ]
    for row in rows:
        base = {k: row[k] for k in ("page", "facility", "section", "item_no", "raw_name")}
        for price in row["prices"]:
            if price["amount"] is None:
                items.append({**base, "problem": f"Price is not a plain number: {price['raw_price']!r} under {price['kelas']!r}"})
        for flag in row["flags"]:
            if flag in _PROBLEMS:
                items.append({**base, "problem": _PROBLEMS[flag]})
    return sorted(items, key=lambda item: item["page"])


def write_review(items: list[dict], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=REVIEW_FIELDS)
        writer.writeheader()
        writer.writerows(items)


def print_review(items: list[dict], path: Path | None) -> None:
    if not items:
        print("needs review: nothing", file=sys.stderr)
        return
    where = f" (listed in {path})" if path else ""
    print(f"needs review: {len(items)} item(s){where}", file=sys.stderr)
    for problem, count in Counter(i["problem"].split(":")[0] for i in items).most_common():
        print(f"  {count:6}  {problem}", file=sys.stderr)


def write_csv(rows: list[dict], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            for price in row["prices"]:
                writer.writerow(
                    {
                        **{k: row[k] for k in ("facility", "page", "section", "item_no", "raw_name", "unit")},
                        "parents": " › ".join(row["parents"]),
                        "members": "; ".join(row["members"]),
                        "flags": ",".join(row["flags"]),
                        **price,
                    }
                )


def print_summary(rows: list[dict], stats: list[dict]) -> None:
    status = Counter(s["status"] for s in stats)
    print(f"pages: {len(stats)} ({dict(status)})", file=sys.stderr)
    print(f"rows: {len(rows)}, prices: {sum(len(r['prices']) for r in rows)}", file=sys.stderr)
    for facility, count in Counter(r["facility"] for r in rows).most_common():
        print(f"  {count:6}  {facility or '(no facility heading)'}", file=sys.stderr)


def _beside(path: Path | None, suffix: str) -> Path | None:
    return path.with_name(f"{path.stem}{suffix}") if path else None


def _page_range(text: str) -> range:
    first, _, last = text.partition("-")
    return range(int(first), int(last or first) + 1)


if __name__ == "__main__":
    main()
