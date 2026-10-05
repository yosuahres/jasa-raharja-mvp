-- DUMMY: three sample hospitals with map pins, to try Peta Rumah Sakit before real documents
-- bring them in. Run after migrations/008_hospital_location.sql. Safe to run more than once.
-- Coordinates are what OpenStreetMap returns for each name; geocoded_query matches what the
-- dashboard would look up, so it leaves these pins alone.
--
-- To remove them:
--   delete from public.hospitals where id in ('dummy-rsud-dr-soetomo', 'dummy-rsud-dr-iskak', 'dummy-rsud-kota-madiun');

insert into public.hospitals (id, name, ownership, city, province, lat, lng, geocoded_query, geocoded_at) values
  ('dummy-rsud-dr-soetomo',  'RSUD Dr. Soetomo',  'Pemerintah', 'Surabaya',    'Jawa Timur', -7.2680296, 112.7582191, 'RSUD Dr. Soetomo, Surabaya, Jawa Timur',     now()),
  ('dummy-rsud-dr-iskak',    'RSUD Dr. Iskak',    'Pemerintah', 'Tulungagung', 'Jawa Timur', -8.0540317, 111.9181394, 'RSUD Dr. Iskak, Tulungagung, Jawa Timur',    now()),
  ('dummy-rsud-kota-madiun', 'RSUD Kota Madiun',  'Pemerintah', 'Madiun',      'Jawa Timur', -7.6121182, 111.5185227, 'RSUD Kota Madiun, Madiun, Jawa Timur',       now())
on conflict (id) do update set
  lat = excluded.lat,
  lng = excluded.lng,
  geocoded_query = excluded.geocoded_query,
  geocoded_at = excluded.geocoded_at;
