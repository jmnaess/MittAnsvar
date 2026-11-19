-- Nye faste kategorier for oppgaver, maler og tilbakemeldingstekster. Se docs/DATABASE.md §2.
--
-- Før:  daily, cleaning, kitchen, laundry, outdoor, maintenance, safety, other
-- Etter: kitchen, tidying, laundry, outdoor, car, pets, maintenance, other
--
-- Mapping:
--   cleaning → tidying («Rydding og rom»)
--   safety   → maintenance
--   daily og alt ukjent → other
--   Maler på slug: bilmalene → car, windows-outside → outdoor, kids-clothes-summer → laundry.
--   Oppgaver laget fra en mal får malens nye kategori. Trygt, fordi ingen har kunnet velge
--   kategori selv før denne migreringen.
--
-- Rekkefølgen i appen (src/features/tasks/categories.ts) er den samme som i listen over.

alter table public.tasks drop constraint tasks_category_check;
alter table public.task_templates drop constraint task_templates_category_check;
alter table public.feedback_messages drop constraint feedback_messages_category_check;

-- ---------------------------------------------------------------------------
-- Generell mapping (alle tre tabeller)
-- ---------------------------------------------------------------------------
create function pg_temp.map_category(c text)
returns text language sql immutable as $$
  select case
    when c = 'cleaning' then 'tidying'
    when c = 'safety' then 'maintenance'
    when c in ('kitchen', 'laundry', 'outdoor', 'maintenance', 'other') then c
    else 'other'
  end
$$;

update public.tasks set category = pg_temp.map_category(category)
where category is distinct from pg_temp.map_category(category);

update public.task_templates set category = pg_temp.map_category(category)
where category is distinct from pg_temp.map_category(category);

-- null = generell tekst, beholdes som null.
update public.feedback_messages set category = pg_temp.map_category(category)
where category is not null and category is distinct from pg_temp.map_category(category);

-- ---------------------------------------------------------------------------
-- Maler som flyttes på slug. Hver slug må finnes, ellers stopper migreringen.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  update public.task_templates set category = 'car'
  where slug in ('summer-tyres', 'winter-tyres', 'car-wash-spring', 'car-winter-ready');
  get diagnostics n = row_count;
  if n <> 4 then
    raise exception 'task_categories: bilmalene traff % rader, ventet 4', n;
  end if;

  update public.task_templates set category = 'outdoor' where slug = 'windows-outside';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'task_categories: windows-outside traff % rader, ventet 1', n;
  end if;

  update public.task_templates set category = 'laundry' where slug = 'kids-clothes-summer';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'task_categories: kids-clothes-summer traff % rader, ventet 1', n;
  end if;
end;
$$;

-- Oppgaver fra mal følger malen (også arkiverte, så en gjenopprettet oppgave er riktig).
update public.tasks t set category = tt.category
from public.task_templates tt
where t.template_id = tt.id and t.category <> tt.category;

-- ---------------------------------------------------------------------------
-- Nye check-constraints
-- ---------------------------------------------------------------------------
alter table public.tasks add constraint tasks_category_check check (category in (
  'kitchen', 'tidying', 'laundry', 'outdoor', 'car', 'pets', 'maintenance', 'other'));

alter table public.task_templates add constraint task_templates_category_check check (category in (
  'kitchen', 'tidying', 'laundry', 'outdoor', 'car', 'pets', 'maintenance', 'other'));

alter table public.feedback_messages add constraint feedback_messages_category_check check (category in (
  'kitchen', 'tidying', 'laundry', 'outdoor', 'car', 'pets', 'maintenance', 'other'));
