-- Where a hospital is on the map: its name and address as its document prints them, looked up on
-- OpenStreetMap after the document is saved. Safe to run more than once.

alter table public.hospitals add column if not exists lat double precision;
alter table public.hospitals add column if not exists lng double precision;
alter table public.hospitals add column if not exists geocoded_query text;      -- what was looked up; a changed address looks it up again
alter table public.hospitals add column if not exists geocoded_at timestamptz;  -- set with lat still null: nothing was found
