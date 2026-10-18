-- Every hospital in the system has a cooperation agreement (PKS) with Jasa Raharja, so the flag
-- said nothing and the dashboard no longer shows it. Safe to run more than once.

alter table public.hospitals drop column if exists partner;
