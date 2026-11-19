-- Steg 16: rutinemaler (daglige, ukentlige og månedlige) med målgruppe, alder og forslag til lønn.
-- Se docs/DATABASE.md §4. Innholdet ligger i *_routine_templates.sql.
--
--   audience             any/adult = foreslås som felles oppgave, child = foreslås per barn.
--   min_age / max_age    bare barnemaler. Alder = året nå − fødselsår. null = ingen grense.
--   suggested_by_default avhuket fra start i forslagslisten.
--   reward_nok           forslag til lønn, bare barnemaler. Kopieres til oppgaven når den tildeles et barn.
--
-- Samme barnemal kan være aktiv én gang per barn: den unike indeksen tar med assigned_member_id.
-- Andre maler er fortsatt bare aktive én gang per husstand, sjekket i activate_templates.

alter table public.task_templates
  add column audience             public.audience not null default 'any',
  add column min_age              smallint,
  add column max_age              smallint,
  add column suggested_by_default boolean not null default true,
  add column reward_nok           integer check (reward_nok between 1 and 10000),
  add constraint task_templates_age_valid check (
    (min_age is null or min_age between 0 and 18)
    and (max_age is null or max_age between 0 and 18)
    and (min_age is null or max_age is null or min_age <= max_age)
  ),
  add constraint task_templates_child_only check (
    audience = 'child' or (min_age is null and max_age is null and reward_nok is null)
  );

-- ---------------------------------------------------------------------------
-- Unik indeks: én aktiv oppgave per mal og ansvarlig (null = felles regnes som én verdi).
-- ---------------------------------------------------------------------------
drop index public.tasks_household_template_key;

create unique index tasks_household_template_member_key
  on public.tasks (household_id, template_id, assigned_member_id) nulls not distinct
  where archived_at is null and template_id is not null;

-- ---------------------------------------------------------------------------
-- activate_templates med valgfri ansvarlig per mal
--
-- p_member_ids har samme lengde som p_template_ids. null (hele listen eller ett element) = felles.
-- Barnemal: medlemmet må være et barn i husstanden. Andre maler: medlemmet må være null.
-- Ellers: invalid_assignment (22023). Lønn kopieres bare når et barn får oppgaven.
-- Andre maler enn barnemaler hoppes over når husstanden har en aktiv oppgave fra malen,
-- uansett hvem den er tildelt (som før indeksen ble endret).
--
-- security invoker: RLS på tasks og triggerne gjelder som før. Feil: 42501 som før.
-- ---------------------------------------------------------------------------
drop function public.activate_templates(uuid, uuid[]);

create function public.activate_templates(
  p_household_id uuid,
  p_template_ids uuid[],
  p_member_ids uuid[] default null
)
returns integer
language plpgsql
security invoker set search_path = ''
as $$
declare
  n int;
begin
  if p_member_ids is not null
     and coalesce(cardinality(p_member_ids), 0) <> coalesce(cardinality(p_template_ids), 0) then
    raise exception 'invalid_assignment' using errcode = '22023';
  end if;

  -- Barnemal krever et barn i husstanden; andre maler krever felles.
  if exists (
    select 1
    from unnest(p_template_ids) with ordinality as a (template_id, ord)
    join public.task_templates tt on tt.id = a.template_id and tt.is_active
    left join public.members m
      on m.id = p_member_ids[a.ord] and m.household_id = p_household_id
    where (tt.audience = 'child' and (m.id is null or m.role <> 'child'))
       or (tt.audience <> 'child' and p_member_ids[a.ord] is not null)
  ) then
    raise exception 'invalid_assignment' using errcode = '22023';
  end if;

  insert into public.tasks
    (household_id, template_id, assigned_member_id, title, description, category, reward_nok,
     recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month,
     season_start_month, season_end_month)
  select p_household_id, tt.id, p_member_ids[a.ord], tt.title, tt.description, tt.category,
         case when p_member_ids[a.ord] is not null then tt.reward_nok end,
         tt.recurrence_type, tt.recurrence_unit, tt.recurrence_every, tt.weekdays, tt.month_day, tt.month,
         tt.season_start_month, tt.season_end_month
  from unnest(p_template_ids) with ordinality as a (template_id, ord)
  join public.task_templates tt on tt.id = a.template_id
  where tt.is_active
    and (tt.audience = 'child' or not exists (
      select 1 from public.tasks t
      where t.household_id = p_household_id and t.template_id = tt.id and t.archived_at is null
    ))
  order by tt.sort_order, a.ord
  on conflict (household_id, template_id, assigned_member_id)
    where archived_at is null and template_id is not null
  do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.activate_templates(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.activate_templates(uuid, uuid[], uuid[]) to authenticated;
