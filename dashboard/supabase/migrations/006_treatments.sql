-- The tindakan each tariff row prices, keyed so the same tindakan matches across hospitals'
-- documents however each prints it (extractor/app/treatments.py). Cari Rujukan picks from them.
-- Safe to run more than once. The worker names the tindakan of documents already stored when it starts.

create table if not exists public.tariff_treatments (
  id      bigint generated always as identity primary key,
  row_id  uuid not null references public.tariff_rows (id) on delete cascade,
  book_id uuid not null references public.tariff_books (id) on delete cascade,
  name    text not null,  -- as printed: the row's name, one of its members, or its heading and variant
  key     text not null   -- what the tindakan is; equal keys are the same tindakan
);

create index if not exists tariff_treatments_key_idx on public.tariff_treatments (key, book_id);
create index if not exists tariff_treatments_book_idx on public.tariff_treatments (book_id);

-- Which version of the rules named a book's tindakan; the worker names them again when it is behind.
alter table public.tariff_books add column if not exists treatments_version integer not null default 0;

alter table public.tariff_treatments enable row level security;
drop policy if exists "signed-in staff" on public.tariff_treatments;
create policy "signed-in staff" on public.tariff_treatments for all to authenticated using (true) with check (true);

-- Every tindakan in the hospitals' current documents, with how many hospitals price it.
create or replace view public.treatment_list with (security_invoker = true) as
with current_books as (
  select distinct on (hospital_id) id, hospital_id
  from public.tariff_books
  where status = 'published' and hospital_id is not null
  order by hospital_id, published_at desc
)
select t.key,
       array_agg(distinct t.name) as names,
       count(distinct b.hospital_id)::integer as hospitals,
       lower(t.key || ' ' || string_agg(distinct t.name, ' ')) as search  -- what typing in the picker matches
from current_books b
join public.tariff_treatments t on t.book_id = b.id
group by t.key;
