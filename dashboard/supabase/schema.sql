-- Jasa Raharja hospital tiering: Supabase schema.
--
-- Run once in the Supabase SQL editor, top to bottom. It creates:
--   1. Catalog: the facilities and specialists recognised in tariff rows. Filled by the extractor
--      worker when it starts, from extractor/app/catalog.py; nobody edits these tables.
--   2. Hospitals: their facilities and specialist staff.
--   3. Tariff books: uploaded PDFs, the rows the extractor read from them, and their prices.
--      A document is the only input: the worker reads the hospital and all its tariff rows from it,
--      files each row under a category, and the dashboard's preview confirms and publishes.
--   4. Access rules: signed-in staff can read and edit everything; anonymous visitors get nothing.
--   5. Storage: a private bucket for the tariff book PDFs.
--
-- The extractor worker uses the service-role (secret) key, which bypasses the access rules.

-- ---------------------------------------------------------------- 1. catalog

-- keywords: other ways a tariff book writes the name, used to detect it in extracted rows
-- (e.g. 'ORTHOPEDI' for Ortopedi). Matching is on whole words, case-insensitive.
create table public.specialties (
  id       text primary key,       -- e.g. 'ortopedi'
  name     text not null,
  keywords text[] not null default '{}'
);

create table public.facilities (
  id       text primary key,       -- e.g. 'ct-scan'
  name     text not null,
  category text not null check (category in ('gawat-darurat', 'operasi', 'rawat', 'radiologi', 'penunjang', 'transport')),
  keywords text[] not null default '{}'  -- e.g. {'MSCT'} for CT Scan
);

-- ---------------------------------------------------------------- 2. hospitals

create table public.hospitals (
  id         text primary key default gen_random_uuid()::text,  -- used in URLs; a short slug reads better
  name       text not null,
  kelas      text check (kelas in ('A', 'B', 'C', 'D')),                              -- null: not printed in its document
  ownership  text check (ownership in ('Pemerintah', 'Swasta', 'BUMN', 'TNI/Polri')),  -- null: not printed in its document
  city       text not null default '',  -- as its document prints it; empty when it doesn't
  province   text not null default '',
  address    text not null default '',
  partner    boolean not null default false,  -- has a cooperation agreement (PKS) with Jasa Raharja
  beds       integer not null default 0 check (beds >= 0),
  created_at timestamptz not null default now()
);

create table public.hospital_facilities (
  hospital_id   text not null references public.hospitals (id) on delete cascade,
  facility_id   text not null references public.facilities (id) on delete cascade,
  qty           integer not null default 1 check (qty >= 0),
  available_24h boolean not null default true,
  primary key (hospital_id, facility_id)
);

create table public.hospital_staff (
  hospital_id  text not null references public.hospitals (id) on delete cascade,
  specialty_id text not null references public.specialties (id) on delete cascade,
  headcount    integer not null default 1 check (headcount >= 0),
  on_call_24h  boolean not null default true,
  primary key (hospital_id, specialty_id)
);

-- ---------------------------------------------------------------- 3. tariff books

-- One uploaded PDF. Lifecycle: queued → extracting → review (the preview) → published (or failed).
-- A hospital's current book is its latest published one by valid_from.
-- hospital_id, version and validity are set when the preview is saved.
create table public.tariff_books (
  id              uuid primary key default gen_random_uuid(),
  hospital_id     text references public.hospitals (id) on delete cascade,
  version         text,
  valid_from      date,
  valid_to        date,
  source_file     text not null,          -- original file name
  storage_path    text not null,          -- object path in the 'tariff-books' bucket
  facility_filter text,                   -- the hospital heading to extract from a regulation listing many
  status          text not null default 'queued'
                  check (status in ('queued', 'extracting', 'review', 'published', 'failed')),
  error           text,
  pages_total     integer,
  pages_done      integer not null default 0,
  scanned_pages   integer[] not null default '{}',  -- pages with no text layer: not extracted
  -- What the extractor found besides tariffs, for the preview:
  detected_name        text,                          -- hospital name from the document's headings or file name
  detected_profile     jsonb not null default '{}',   -- {field: {value, source}}: city, year, ownership, ...
  document_hospitals   jsonb not null default '[]',   -- [{heading, name, pages}] every hospital the document lists
  category_counts      jsonb not null default '{}',   -- {category: rows}, from tariff_rows.category
  detected_facilities  jsonb not null default '[]',   -- [{id, rows, page, evidence}] per catalog facility
  detected_specialties jsonb not null default '[]',   -- same, per catalog specialty
  uploaded_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  extracted_at    timestamptz,
  published_at    timestamptz,
  check (valid_to > valid_from)
);

create index tariff_books_hospital_idx on public.tariff_books (hospital_id, status, valid_from desc);
create index tariff_books_queue_idx on public.tariff_books (created_at) where status = 'queued';

-- One item the extractor read from a book's tables, exactly as printed.
create table public.tariff_rows (
  id                  uuid primary key default gen_random_uuid(),
  book_id             uuid not null references public.tariff_books (id) on delete cascade,
  position            integer not null,       -- order in the book
  page                integer not null,
  facility            text,                   -- hospital heading the row sits under
  part                text,                   -- part of a regulation, e.g. 'II. PENAMBAHAN ...'
  section             text,                   -- headings, joined with ' › '
  parents             text[] not null default '{}',  -- list nesting, e.g. {'Rawat Inap Kelas III'}
  item_no             text,
  raw_name            text not null,
  unit                text,                   -- e.g. '/tindakan', 'Orang/perhari'
  members             text[] not null default '{}',  -- unpriced lines that share this row's price
  flags               text[] not null default '{}',  -- unparsed_price, continued_across_pages, unlabelled_columns
  category            text not null default 'lainnya',  -- kind of service, e.g. 'operatif', 'radiologi' (extractor/app/categories.py)
  checked             boolean not null default false,
  unique (book_id, position)
);

create index tariff_rows_category_idx on public.tariff_rows (book_id, category);

-- One price cell of a row: one per class / column, e.g. 'TARIF BARU / EKSEKUTIF'.
create table public.tariff_prices (
  id         bigint generated always as identity primary key,
  row_id     uuid not null references public.tariff_rows (id) on delete cascade,
  kelas      text not null,             -- column label as printed
  raw_price  text not null,             -- cell text as printed
  amount     bigint check (amount >= 0),  -- rupiah; null when the cell isn't a plain number
  superseded boolean not null default false  -- an old price ('TARIF LAMA') kept beside the new one
);

create index tariff_prices_row_idx on public.tariff_prices (row_id);

-- How each hospital's prices compare with the others', from the rows their documents name the same way.
create or replace view public.hospital_price_index with (security_invoker = true) as
with current_books as (
  -- A hospital's current document is its latest published one.
  select distinct on (hospital_id) id, hospital_id
  from public.tariff_books
  where status = 'published' and hospital_id is not null
  order by hospital_id, published_at desc
),
row_prices as (
  select b.hospital_id,
         trim(regexp_replace(upper(r.raw_name), '[^A-Z0-9]+', ' ', 'g')) as name_key,
         (min(p.amount) + max(p.amount)) / 2.0 as mid
  from current_books b
  join public.tariff_rows r on r.book_id = b.id
  join public.tariff_prices p on p.row_id = r.id
  where p.amount > 0 and not p.superseded
  group by b.hospital_id, r.id, r.raw_name
),
-- One price per name per hospital: a document can list the same name in several sections.
hospital_prices as (
  select hospital_id, name_key, percentile_cont(0.5) within group (order by mid) as mid
  from row_prices
  where length(name_key) >= 4
  group by hospital_id, name_key
),
shared as (
  select name_key, percentile_cont(0.5) within group (order by mid) as median
  from hospital_prices
  group by name_key
  having count(*) >= 2
)
select h.hospital_id,
       avg(h.mid / s.median) as price_index,  -- 0.92: 8% cheaper than the median of the same rows elsewhere
       count(*)::integer as compared_rows
from hospital_prices h
join shared s using (name_key)
group by h.hospital_id;

-- ---------------------------------------------------------------- 4. access rules

-- An internal tool: any signed-in staff member can read and edit everything.
do $$
declare
  t text;
begin
  foreach t in array array[
    'specialties', 'facilities', 'hospitals', 'hospital_facilities', 'hospital_staff',
    'tariff_books', 'tariff_rows', 'tariff_prices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "signed-in staff" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- 5. storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tariff-books', 'tariff-books', false, 52428800, array['application/pdf'])  -- 50 MB
on conflict (id) do nothing;

create policy "staff upload tariff books" on storage.objects
  for insert to authenticated with check (bucket_id = 'tariff-books');

create policy "staff read tariff books" on storage.objects
  for select to authenticated using (bucket_id = 'tariff-books');

-- Discarding an upload from its preview removes its file.
create policy "staff delete tariff books" on storage.objects
  for delete to authenticated using (bucket_id = 'tariff-books');
