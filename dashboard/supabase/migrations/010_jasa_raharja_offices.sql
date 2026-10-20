-- Jasa Raharja's own list of partner hospitals (the "RS JATIM" spreadsheet): each with the office
-- (loket) that handles claims for it. Uploaded whole from the Daftar RS page; a hospital in the app
-- is linked to its row by name when a document is saved. Safe to run more than once.

create table if not exists public.jr_hospitals (
  code       text primary key,       -- KODE_RUMAHSAKIT, e.g. '0504001'
  name       text not null,          -- NAMA_RS as the sheet prints it, e.g. 'RSUD SOEDONO, KOTA MADIUN'
  loket_code text not null,          -- KODE_LOKET, e.g. '0500401'
  loket_name text not null,          -- NAMA_LOKET, e.g. 'LOKET KANTOR CABANG MADIUN'
  updated_at timestamptz not null default now()
);

alter table public.hospitals add column if not exists jr_code text references public.jr_hospitals (code) on delete set null;

alter table public.jr_hospitals enable row level security;
drop policy if exists "signed-in staff" on public.jr_hospitals;
create policy "signed-in staff" on public.jr_hospitals for all to authenticated using (true) with check (true);
