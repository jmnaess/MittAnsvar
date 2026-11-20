-- Feiring i fullskjerm for barn: tekstgrupper og «siste oppgave for dagen».
-- Se docs/DATABASE.md §4 (feedback_messages) og §5 (complete_task).
--
-- feedback_messages.kind:
--   regular  – vanlig tilbakemelding (alle eksisterende tekster). Følger husstandens tone.
--   day_done – barnets siste oppgave for dagen. Gjelder alle toner.
--   young    – barn som er 5 år eller yngre (år i dag minus fødselsår). Gjelder alle toner.
-- day_done går foran young. Finnes ingen aktiv tekst i ønsket gruppe, brukes en regular-tekst.
-- Voksne får alltid regular.
--
-- complete_task får p_last_today (default false): klienten vet hva som står igjen i
-- «Mine oppgaver i dag» eller på personens kort. Brukes bare når utføreren er barn.
-- Returnerer i tillegg feedback_kind, så appen kan velge feiring.

alter table public.feedback_messages
  add column kind text not null default 'regular'
    check (kind in ('regular', 'day_done', 'young'));

-- Utkast til tekster. Tre av de vanlige finnes fra før (text er unik), de hoppes over.
-- tone = 'humor' fordi CHECK krever fact eller humor. For day_done og young brukes ikke tonen.
insert into public.feedback_messages (tone, audience, kind, text) values
  ('humor', 'child', 'regular',  'Yes! Den er i boks.'),
  ('humor', 'child', 'regular',  'Sånn! Der tok du din del.'),
  ('humor', 'child', 'regular',  'Takk! Det merker hele familien.'),
  ('humor', 'child', 'regular',  'Hjemmet ble litt bedre nå.'),
  ('humor', 'child', 'regular',  'Rask og grei!'),
  ('humor', 'child', 'regular',  'Den tok du!'),
  ('humor', 'child', 'regular',  'Ferdig – og bra gjort.'),
  ('humor', 'child', 'regular',  'Én mindre å tenke på!'),
  ('humor', 'child', 'regular',  'Du er god på dette.'),
  ('humor', 'child', 'day_done', 'Alt er gjort i dag! 🎉'),
  ('humor', 'child', 'day_done', 'Dagen er i boks. Nå har du fri!'),
  ('humor', 'child', 'day_done', 'Alle oppgavene dine er gjort. Sterkt!'),
  ('humor', 'child', 'young',    'Hurra!'),
  ('humor', 'child', 'young',    'Så fint du gjorde det!'),
  ('humor', 'child', 'young',    'Kjempebra!'),
  ('humor', 'child', 'young',    'Høy fem! ✋')
on conflict (text) do nothing;

-- Ny parameter og ny returkolonne: funksjonen må droppes og lages på nytt.
drop function public.complete_task(uuid, uuid);

create function public.complete_task(p_task_id uuid, p_member_id uuid,
                                     p_last_today boolean default false)
returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer,
               status public.completion_status, feedback_kind text)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t          public.tasks;
  caller     public.members;
  doer       public.members;
  is_display boolean := false;
  hh_tone    public.feedback_tone;
  today      date;
  new_due    date;
  fb_id      uuid;
  fb_text    text;
  new_id     uuid;
  reward     integer;
  new_status public.completion_status;
  wanted     text;
  last_same  uuid;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found or t.archived_at is not null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = t.household_id and auth_user_id = auth.uid();
  if not found then
    is_display := private.my_display_household() is not distinct from t.household_id
                  and private.my_display_household() is not null;
    if not is_display then
      raise exception 'task_not_found' using errcode = 'P0001';
    end if;
  end if;

  if not private.household_has_access(t.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select * into doer from public.members
  where id = p_member_id and household_id = t.household_id;
  if not found or (caller.role = 'child' and doer.id <> caller.id) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if caller.role = 'child' and not (
    case when t.recurrence_type = 'job'
      then cardinality(t.job_member_ids) = 0 or caller.id = any (t.job_member_ids)
      else t.assigned_member_id is null or t.assigned_member_id = caller.id
    end
  ) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  select feedback_tone into hh_tone from public.households where id = t.household_id;
  today   := private.household_today(t.household_id);

  if is_display then
    -- Skjermen kan vise litt gamle data. Uten denne sperren ville et trykk på en oppgave som
    -- nettopp ble gjort et annet sted, krysset av neste forekomst.
    if t.recurrence_type <> 'job' and (t.next_due_on is null or t.next_due_on > today) then
      raise exception 'task_not_due' using errcode = 'P0001';
    end if;

    if not (
      case when t.recurrence_type = 'job'
        then doer.role = 'child'
             and (cardinality(t.job_member_ids) = 0 or doer.id = any (t.job_member_ids))
        else t.assigned_member_id is null or t.assigned_member_id = doer.id
      end
    ) then
      raise exception 'invalid_member' using errcode = 'P0001';
    end if;
  end if;

  new_due := private.compute_next_due(t, today);
  reward  := case when doer.role = 'child' then t.reward_nok end;
  -- Lønn registrert av barnet selv eller på familieskjermen må godkjennes av en voksen.
  new_status := case when reward is not null and (is_display or caller.role = 'child')
                     then 'pending' else 'approved' end;

  -- Tekstgruppe: siste for dagen går foran alder. Voksne får alltid regular.
  wanted := case
    when doer.role <> 'child' then 'regular'
    when coalesce(p_last_today, false) then 'day_done'
    when doer.birth_year is not null
         and extract(year from today)::int - doer.birth_year <= 5 then 'young'
    else 'regular'
  end;

  -- Den siste teksten i samme gruppe som denne personen fikk. Den skal ikke komme to ganger på rad.
  select c.feedback_message_id into last_same
  from public.task_completions c
  join public.feedback_messages fm on fm.id = c.feedback_message_id
  where c.household_id = t.household_id
    and c.completed_by_member_id = doer.id
    and fm.kind = wanted
  order by c.completed_at desc
  limit 1;

  select m.id, m.text into fb_id, fb_text
  from public.feedback_messages m
  where m.is_active
    and m.kind in (wanted, 'regular')
    and (m.kind <> 'regular' or hh_tone = 'both' or m.tone = hh_tone::text)
    and m.audience in ('any', doer.role::text::public.audience)
    and (m.category is null or m.category = t.category)
  order by
    m.kind <> wanted,
    m.id is not distinct from last_same,
    m.id in (
      select c.feedback_message_id
      from public.task_completions c
      where c.household_id = t.household_id and c.feedback_message_id is not null
      order by c.completed_at desc
      limit 20
    ),
    m.category is null,
    random()
  limit 1;

  insert into public.task_completions
    (household_id, task_id, completed_by_member_id, recorded_by,
     completed_on, completed_at, due_on, feedback_message_id, reward_nok, status)
  values
    (t.household_id, t.id, doer.id, auth.uid(),
     today, clock_timestamp(), t.next_due_on, fb_id, reward, new_status)
  returning id into new_id;

  update public.tasks
  set next_due_on = new_due,
      archived_at = case when t.recurrence_type = 'job' and not t.job_repeats
                         then now() else archived_at end
  where id = t.id;

  return query select new_id, fb_text, new_due, reward, new_status, wanted;
end;
$$;

revoke execute on function public.complete_task(uuid, uuid, boolean) from public, anon;
grant  execute on function public.complete_task(uuid, uuid, boolean) to authenticated;
