-- Spørringer for testuka. Bare lesing: kjør dem i SQL-editoren i Supabase.
-- «Dag» er datoen i husstandens tidssone (households.timezone).
-- «Siste 7 dager» = i dag og de 6 dagene før (siste 14 tilsvarende).
-- Angrede avkrysninger slettes i appen og telles derfor ikke.


-- 1. Per husstand: hvor mange dager de har brukt appen, og hvem som krysser av.
with c as (
  select
    tc.household_id,
    tc.completed_by_member_id as member_id,
    m.role,
    (tc.completed_at at time zone h.timezone)::date as day,
    (now() at time zone h.timezone)::date           as today
  from public.task_completions tc
  join public.households h on h.id = tc.household_id
  join public.members m    on m.id = tc.completed_by_member_id
)
select
  h.name                                                          as husstand,
  (h.created_at at time zone h.timezone)::date                    as opprettet,
  count(distinct c.day) filter (where c.day > c.today - 7)        as dager_siste_7,
  count(distinct c.day) filter (where c.day > c.today - 14)       as dager_siste_14,
  count(c.member_id)                                              as avkrysninger_totalt,
  count(c.member_id) filter (where c.day > c.today - 14 and c.role = 'child') as av_barn_siste_14,
  count(c.member_id) filter (where c.day > c.today - 14 and c.role = 'adult') as av_voksne_siste_14,
  count(distinct c.member_id)                                     as personer_som_har_krysset_av,
  count(distinct c.member_id) filter (where c.day > c.today - 7 and c.role = 'child') as barn_siste_7
from public.households h
left join c on c.household_id = h.id
group by h.id, h.name, h.created_at, h.timezone
order by h.created_at;


-- 2. Per husstand og dag siste 14 dager: holder bruken seg i uke 2?
--    Dager uten avkrysninger vises med 0.
with days as (
  select
    h.id   as household_id,
    h.name,
    h.created_at,
    h.timezone,
    d::date as day
  from public.households h
  cross join lateral generate_series(
    (now() at time zone h.timezone)::date - 13,
    (now() at time zone h.timezone)::date,
    interval '1 day'
  ) as d
)
select
  days.name as husstand,
  days.day  as dag,
  count(tc.id) as avkrysninger
from days
left join public.task_completions tc
  on tc.household_id = days.household_id
 and (tc.completed_at at time zone days.timezone)::date = days.day
group by days.household_id, days.name, days.created_at, days.day
order by days.created_at, days.household_id, days.day;
