-- For a database that already ran the first schema.sql: lets uploads create hospitals and
-- fill master data from the tariff book. Fresh installs get all of this from schema.sql.

alter table public.specialties add column if not exists keywords text[] not null default '{}';
alter table public.facilities  add column if not exists keywords text[] not null default '{}';

alter table public.procedures alter column category drop not null;
alter table public.procedures add constraint procedures_icd9_key unique (icd9);
alter table public.procedures
  add column if not exists source_book_id uuid references public.tariff_books (id) on delete set null;

alter table public.tariff_books alter column hospital_id drop not null;
alter table public.tariff_books add column if not exists detected_name text;
alter table public.tariff_books add column if not exists detected_facilities jsonb not null default '[]';
alter table public.tariff_books add column if not exists detected_specialties jsonb not null default '[]';
alter table public.tariff_books add column if not exists procedures_added integer not null default 0;
