-- One input: a tariff document is uploaded, the worker reads the hospital and its tariffs from it,
-- and the dashboard's preview confirms them. Run once on a database set up with an earlier schema.sql;
-- fresh installs get all of this from schema.sql.

-- Keywords the worker matches tariff rows on, one row per catalog procedure (see extractor/app/matching.py).
alter table public.procedures add column if not exists keywords text[] not null default '{}';
alter table public.cities add column if not exists province text not null default '';

-- Fields a document may not print stay empty rather than guessed.
alter table public.hospitals alter column kelas drop not null;
alter table public.hospitals alter column ownership drop not null;

-- The worker fills these from the document; the upload only sends the file.
alter table public.tariff_books alter column version drop not null;
alter table public.tariff_books alter column valid_from drop not null;
alter table public.tariff_books alter column valid_to drop not null;
alter table public.tariff_books add column if not exists detected_profile jsonb not null default '{}';
alter table public.tariff_books add column if not exists document_hospitals jsonb not null default '[]';

-- Case prices are now worked out from the matched rows in the dashboard.
drop view if exists public.case_tariffs;

-- Procedures the old worker added from tariff books. Rows now match the existing catalog only.
delete from public.procedures where source_book_id is not null;

update public.procedures set keywords = array['PEMERIKSAAN DOKTER @IGD', 'PEMERIKSAAN DOKTER @DARURAT', 'PELAYANAN GAWAT DARURAT', 'KONSULTASI IGD', 'TRIASE']::text[] where id = 'konsul-igd';
update public.procedures set keywords = array['OBSERVASI @IGD', 'OBSERVASI @DARURAT', 'OBSERVASI IGD']::text[] where id = 'observasi-igd';
update public.procedures set keywords = array['CLAVICLE ORIF', 'CLAVICULA ORIF', 'KLAVIKULA ORIF', 'CLAVICLE PLATE', 'CLAVICULA PLATE', 'CLAVICLE FIXATION']::text[] where id = 'orif-clavicle';
update public.procedures set keywords = array['FEMUR ORIF -PAEDIATRIC -CHILDREN', 'FEMUR PLATE -PAEDIATRIC -CHILDREN', 'FEMUR INTRAMEDULLARY -PAEDIATRIC -CHILDREN', 'FEMUR FIXATION -PAEDIATRIC -CHILDREN']::text[] where id = 'orif-femur';
update public.procedures set keywords = array['RADIUS REPOSISI', 'RADIUS CLOSED REDUCTION -OPEN', 'RADIUS MANIPULATION -OPEN']::text[] where id = 'reposisi-radius';
update public.procedures set keywords = array['KRANIOTOMI', 'CRANIOTOMY EVACUATION', 'CRANIOTOMY HEMATOMA']::text[] where id = 'kraniotomi';
update public.procedures set keywords = array['HECTING -ESTETIK', 'HEACTING -ESTETIK', 'HECHTING -ESTETIK', 'JAHIT LUKA -ESTETIK -WAJAH', 'PENJAHITAN LUKA -ESTETIK -WAJAH', 'JAHIT VULNUS', 'HECTING VULNUS']::text[] where id = 'hecting';
update public.procedures set keywords = array['GIPS', 'GYPS']::text[] where id = 'gips';
update public.procedures set keywords = array['ANESTESI UMUM', 'ANESTHESI UMUM', 'ANASTESI UMUM', 'PEMBIUSAN UMUM']::text[] where id = 'anestesi-umum';
update public.procedures set keywords = array['TRANSFUSI PRC', 'PACKED RED CELL', 'PRC @DARAH', 'PEMASANGAN TRANSFUSI']::text[] where id = 'transfusi-prc';
update public.procedures set keywords = array['CLAVICULA @RADIOLOGI', 'CLAVICLE @RADIOLOGI', 'SHOULDER @RADIOLOGI', 'BAHU @RADIOLOGI']::text[] where id = 'rontgen-bahu';
update public.procedures set keywords = array['ANTEBRACHII @RADIOLOGI', 'ANTEBRACHI @RADIOLOGI', 'FOREARM @RADIOLOGI', 'LENGAN BAWAH @RADIOLOGI']::text[] where id = 'rontgen-lengan';
update public.procedures set keywords = array['FEMUR @RADIOLOGI']::text[] where id = 'rontgen-femur';
update public.procedures set keywords = array['CT SCAN KEPALA -ANGIO -ANGIOGRAPHY -ANGIOGRAFI', 'CT KEPALA -ANGIO -ANGIOGRAPHY', 'CT SCAN HEAD -ANGIO -ANGIOGRAPHY', 'CT SCAN BRAIN -ANGIO -ANGIOGRAPHY', 'MSCT KEPALA -ANGIO -ANGIOGRAPHY']::text[] where id = 'ct-kepala';
update public.procedures set keywords = array['DARAH RUTIN', 'DARAH LENGKAP', 'HEMATOLOGI RUTIN']::text[] where id = 'lab-darah';
update public.procedures set keywords = array['KELAS II @RAWAT INAP', 'KELAS 2 @RAWAT INAP', 'KELAS II @AKOMODASI', 'KELAS 2 @AKOMODASI', 'KELAS II @KAMAR', 'KELAS 2 @KAMAR']::text[] where id = 'kamar-kelas-2';
update public.procedures set keywords = array['ICU @RAWAT INAP', 'ICU @AKOMODASI', 'ICU @KAMAR', 'INTENSIVE CARE UNIT']::text[] where id = 'kamar-icu';

update public.cities set province = 'DKI Jakarta' where name = 'Jakarta Pusat';
update public.cities set province = 'DKI Jakarta' where name = 'Jakarta Selatan';
update public.cities set province = 'DKI Jakarta' where name = 'Jakarta Timur';
update public.cities set province = 'Jawa Barat' where name = 'Bekasi';
update public.cities set province = 'Jawa Barat' where name = 'Depok';
update public.cities set province = 'Jawa Barat' where name = 'Bogor';
update public.cities set province = 'Banten' where name = 'Tangerang';
update public.cities set province = 'Jawa Timur' where name = 'Surabaya';
update public.cities set province = 'Jawa Timur' where name = 'Madiun';
update public.cities set province = 'Jawa Timur' where name = 'Tulungagung';
insert into public.cities (name, lat, lng, province) values
  ('Malang', -7.9666, 112.6326, 'Jawa Timur'),
  ('Batu', -7.8671, 112.5239, 'Jawa Timur'),
  ('Kediri', -7.848, 112.0178, 'Jawa Timur'),
  ('Jember', -8.1724, 113.7004, 'Jawa Timur'),
  ('Pamekasan', -7.1568, 113.4746, 'Jawa Timur'),
  ('Sidoarjo', -7.4478, 112.7183, 'Jawa Timur')
on conflict (name) do nothing;

-- Discarding an upload from its preview removes its file.
create policy "staff delete tariff books" on storage.objects
  for delete to authenticated using (bucket_id = 'tariff-books');

-- Books read by the old worker: read them again with the new one.
update public.tariff_books set status = 'queued', pages_done = 0, facility_filter = null where status = 'review';
