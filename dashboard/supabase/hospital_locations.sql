-- Map pins for the two sample hospitals OpenStreetMap can't find by the names their documents print
-- ("RSUD DR. SOEDONO", "RS UBAYA"), so Peta Rumah Sakit lists them under "Lokasi belum ditemukan".
-- Run after migrations/008_hospital_location.sql, once their documents are in. Safe to run more than once.
--
-- Coordinates are OpenStreetMap's for each hospital:
--   RSUD Dr. Soedono Madiun          — Jl. Dokter Sutomo 59, Kartoharjo, Kota Madiun
--   Rumah Sakit Universitas Surabaya — Jl. Raya Panjang Jiwo Permai, Tenggilis Mejoyo, Surabaya
-- RS Ubaya's document prints no city, so it gets Surabaya too — the map's and Cari Rujukan's city lists
-- then include it.
--
-- geocoded_query is set to exactly what the dashboard would look up (name, address, city, province,
-- the empty ones left out — lib/geocode.ts), so the geocoder leaves these pins alone. A new document
-- with a different name or address looks the hospital up again, and that lookup can clear the pin;
-- run this file again if it does.

update public.hospitals
set city = case when city = '' then 'Surabaya' else city end,
    province = case when province = '' then 'Jawa Timur' else province end
where upper(name) like '%UBAYA%';

update public.hospitals as h
set lat = pin.lat,
    lng = pin.lng,
    geocoded_query = concat_ws(', ', nullif(h.name, ''), nullif(h.address, ''), nullif(h.city, ''), nullif(h.province, '')),
    geocoded_at = now()
from (values
  ('%SOEDONO%', -7.6266935, 111.5245179),
  ('%UBAYA%',   -7.3141801, 112.7662757)
) as pin (name_like, lat, lng)
where upper(h.name) like pin.name_like;
