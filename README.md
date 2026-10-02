# Jasa Raharja — Hospital Tiering

Prototype for recommending referral hospitals for traffic-accident victims based on
tariff books, facilities, and medical staff.

- `dashboard/` — Next.js 16 + Tailwind + shadcn/ui + Recharts, on Supabase (auth, database, file storage).
  Scoring logic lives in `src/lib/scoring.ts`.
- `extractor/` — Python extractor that turns tariff book PDFs into reviewable tariff rows, plus a
  worker that picks up books uploaded from the dashboard.
- `dashboard/supabase/` — `schema.sql` (tables, access rules, storage bucket) and an optional `seed_catalog.sql`.

## Setup

1. **Create a Supabase project.** In the SQL editor run `dashboard/supabase/schema.sql`. A database set up
   with an earlier version runs the files in `dashboard/supabase/migrations/` it hasn't run yet, in order.
   There is no data to load: hospitals and tariffs come from uploaded documents. The facilities and
   specialists the system recognises live in `extractor/app/catalog.py`, and the worker writes them to the
   database when it starts.
2. **Dashboard:** copy `dashboard/.env.example` to `dashboard/.env.local` and fill in the project URL
   and publishable key, then:

   ```bash
   cd dashboard
   pnpm install
   pnpm dev        # http://localhost:3000, sign up, then sign in
   ```

   Supabase asks new users to confirm their email by default (Authentication → Sign In / Providers).
3. **Extractor worker:** copy `extractor/.env.example` to `extractor/.env` and fill in the project URL
   and secret key, then keep it running:

   ```bash
   cd extractor
   python -m venv .venv && .venv/bin/pip install -r requirements.txt
   .venv/bin/python -m app.worker
   ```

A tariff document is the only input. Upload it from **Upload dokumen** (top bar); nothing is typed:

1. **Upload.** Drop the PDF. It goes to Storage and the worker picks it up.
2. **Read.** The worker finds which hospital the document is about (a regulation listing many hospitals:
   the one the file name names, else the one with the most pages) and extracts all of that hospital's
   rows. It reads the hospital's profile from the text: name, city and province, year, address, type,
   ownership and whether it is a partner ("Rekanan"). Facilities and specialists are recognised from the
   rows. Nothing is looked up elsewhere; a field the document doesn't print stays empty.
3. **File.** Every row is kept and filed under a kind of service (tindakan operatif, radiologi,
   laboratorium, kamar & rawat inap, …) from its name and the headings it sits under
   (`extractor/app/categories.py`). There is no predefined list of injury cases or procedures.
4. **Preview and save.** The dashboard shows every field with where it was read, and every row by
   category. Saving creates the hospital, or updates the one with the same name, and publishes.

**Rumah Sakit** ranks hospitals in general: specialists and facilities recognised, how many kinds of
service the document prices, and emergency access. **Cari Rujukan** takes what is needed in words
("kraniotomi", "CT scan kepala") and a city, finds the rows that name it in every hospital's document, and
ranks those hospitals by that price against the median, their general score, and same city / province.

## Extracting a tariff book

```bash
cd extractor
python -m venv .venv && .venv/bin/pip install -r requirements.txt

# A hospital's own book (its name only appears on a scanned cover)
.venv/bin/python -m app.cli "../data/Buku Tarif Rekanan RS Ubaya Tahun 2025_Update.pdf" \
    --facility-name "RS Ubaya" --out ubaya.json --csv ubaya.csv

# One hospital out of a regulation that lists many (Pergub Jatim: ~2 min for 2,954 pages)
.venv/bin/python -m app.cli "../data/1. TARIF RSUD DR SOEDONO MADIUN.pdf" \
    --facility SOEDONO --out soedono.json --csv soedono.csv

.venv/bin/python -m pytest      # regression tests against the sample books in data/
```

The extractor is plain Python on top of pymupdf: it reads the ruled tables from the
PDF's text layer, with no AI model or API calls. It works on any book whose tables are
drawn with lines, whatever its columns:

- **Price columns** are labelled from their full header path, e.g. `KELAS PERAWATAN / VIP`,
  `TARIF BARU / EKSEKUTIF`, `TARIF / NON. PAV`. Prices under `TARIF LAMA` are marked
  `superseded`. A price cell merged across several class columns applies to each.
- **Rows** carry `facility`, `part` (which part of a regulation), `section` (headings),
  `parents` (list nesting such as `Rawat Inap Kelas III › a. Kamar`), `unit`, and `members`:
  unpriced lines listed under a priced line, such as the procedures in
  "Kelompok Bedah F", which all take its price.
- **Nothing unclear is guessed.** Each run also writes `<out>_review.csv`, listing what a
  person should check against the PDF: prices that aren't plain numbers (text, typos, `0`),
  names joined across a page break, tables with no header row, and scanned pages that
  have no text to read.

