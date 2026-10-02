-- How each hospital's prices compare with the others', from the rows their documents name the same way
-- ("D DIMER", "USG KANDUNGAN"). Safe to run more than once.

create or replace view public.hospital_price_index with (security_invoker = true) as
with current_books as (
  -- A hospital's current document is its latest published one.
  select distinct on (hospital_id) id, hospital_id
  from public.tariff_books
  where status = 'published' and hospital_id is not null
  order by hospital_id, published_at desc
),
row_prices as (
  select b.hospital_id,
         trim(regexp_replace(upper(r.raw_name), '[^A-Z0-9]+', ' ', 'g')) as name_key,
         (min(p.amount) + max(p.amount)) / 2.0 as mid
  from current_books b
  join public.tariff_rows r on r.book_id = b.id
  join public.tariff_prices p on p.row_id = r.id
  where p.amount > 0 and not p.superseded
  group by b.hospital_id, r.id, r.raw_name
),
-- One price per name per hospital: a document can list the same name in several sections.
hospital_prices as (
  select hospital_id, name_key, percentile_cont(0.5) within group (order by mid) as mid
  from row_prices
  where length(name_key) >= 4
  group by hospital_id, name_key
),
shared as (
  select name_key, percentile_cont(0.5) within group (order by mid) as median
  from hospital_prices
  group by name_key
  having count(*) >= 2
)
select h.hospital_id,
       avg(h.mid / s.median) as price_index,  -- 0.92: 8% cheaper than the median of the same rows elsewhere
       count(*)::integer as compared_rows
from hospital_prices h
join shared s using (name_key)
group by h.hospital_id;
