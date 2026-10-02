-- Everything about a hospital comes from its document. Safe to run more than once.

-- Coordinates are never printed in a document, so they go, and with them the city list:
-- a hospital's city and province are read from its document's text.
alter table public.hospitals drop column if exists lat;
alter table public.hospitals drop column if exists lng;
alter table public.hospitals alter column city set default '';
alter table public.hospitals alter column province set default '';
drop table if exists public.cities;

-- Every row of a document is kept and filed under a category; nothing is matched to a predefined list.
alter table public.tariff_rows add column if not exists category text not null default 'lainnya';
alter table public.tariff_rows drop column if exists mapped_case_id;
alter table public.tariff_rows drop column if exists mapped_procedure_id;
drop table if exists public.case_procedures, public.case_specialties, public.case_facilities, public.injury_cases, public.procedures cascade;
create index if not exists tariff_rows_category_idx on public.tariff_rows (book_id, category);
alter table public.tariff_books add column if not exists category_counts jsonb not null default '{}';  -- {category: rows}

-- Read pending uploads again with the current worker.
update public.tariff_books set status = 'queued', pages_done = 0, error = null where status in ('review', 'extracting');
