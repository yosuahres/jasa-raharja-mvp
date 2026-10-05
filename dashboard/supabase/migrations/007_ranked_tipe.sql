-- A hospital's tipe (A–D) comes from the ranking, not its document, so the column read from the
-- document goes. Documents don't print how many of a facility or specialist a hospital has, or
-- their hours: those stay empty instead of the 1 / 24 hours saving used to fill in.
-- Safe to run more than once.

alter table public.hospitals drop column if exists kelas;

alter table public.hospital_facilities alter column qty drop not null;
alter table public.hospital_facilities alter column qty drop default;
alter table public.hospital_facilities alter column available_24h drop not null;
alter table public.hospital_facilities alter column available_24h drop default;
update public.hospital_facilities set qty = null, available_24h = null;

alter table public.hospital_staff alter column headcount drop not null;
alter table public.hospital_staff alter column headcount drop default;
alter table public.hospital_staff alter column on_call_24h drop not null;
alter table public.hospital_staff alter column on_call_24h drop default;
update public.hospital_staff set headcount = null, on_call_24h = null;
