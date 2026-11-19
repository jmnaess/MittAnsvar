-- Familieskjerm: felles husstandsvisning på en egen enhet, typisk en iPad på kjøkkenet.
-- Se docs/ARCHITECTURE.md §3 og docs/DATABASE.md §1, §3, §5 og §6.
--
-- Flyt (samme som barnets enhet, 20261117190000_child_devices.sql):
--   1. En voksen lager en kode (create_display_link_token). Koden vises som QR og tekst.
--   2. Skjermen logger inn anonymt og løser inn koden (redeem_link_token).
--   3. En voksen kobler fra (unlink_display). Den anonyme brukeren slettes.
--
-- Hvorfor en egen tabell og ikke en rolle i members?
--   Alle innloggede er samme Postgres-rolle (authenticated), så kolonnerettigheter kan ikke skille
--   skjermen fra andre. Lesetilgang via RLS ville også gitt fødselsår, hjemprofil, alle oppgaver og
--   all historikk. Skjermen er derfor ikke medlem: alle eksisterende policyer er stengt for den, og
--   den får bare det get_family_board returnerer.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   create_display_link_token: not_adult
--   unlink_display:            not_adult
--   complete_task:             task_not_due (bare skjerm: oppgaven står ikke lenger i «I dag»)

-- ---------------------------------------------------------------------------
-- Tabell
-- ---------------------------------------------------------------------------
create table public.household_displays (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  -- set null: skjermen skal virke videre når den voksne som koblet den, sletter kontoen sin.
  created_by   uuid references public.members (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index household_displays_household_id_idx on public.household_displays (household_id);

revoke all on public.household_displays from anon, authenticated;
grant select (id, household_id, created_at) on public.household_displays to authenticated;
alter table public.household_displays enable row level security;

-- ---------------------------------------------------------------------------
-- link_tokens: member_id null = kode for en familieskjerm.
-- ---------------------------------------------------------------------------
alter table public.link_tokens alter column member_id drop not null;

-- ---------------------------------------------------------------------------
-- Hjelpere
-- ---------------------------------------------------------------------------
create function private.my_display_household()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select d.household_id
  from public.household_displays d
  where d.auth_user_id = auth.uid();
$$;

-- Bare bilder som faktisk vises: personen har valgt bilde, og stien er bildet i bruk.
create function private.display_can_read_photo(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = private.my_display_household()
      and m.photo_path = object_name
      and m.avatar_mode = 'photo'
  );
$$;

create policy household_displays_select on public.household_displays
  for select to authenticated
  using (private.is_adult(household_id));

create policy member_photos_select_display on storage.objects
  for select to authenticated
  using (bucket_id = 'member-photos' and private.display_can_read_photo(name));

-- ---------------------------------------------------------------------------
-- create_display_link_token: en voksen lager en kode. Klarteksten returneres bare her.
-- ---------------------------------------------------------------------------
create function public.create_display_link_token(p_household_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer set search_path = ''
as $$
declare
  new_code    text;
  new_expires timestamptz := now() + interval '10 minutes';
  tries       int := 0;
begin
  if not private.is_adult(p_household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  -- Bare den nyeste skjermkoden gjelder.
  delete from public.link_tokens t
  where t.household_id = p_household_id and t.member_id is null and t.used_at is null;

  loop
    tries := tries + 1;
    new_code := private.generate_invite_code();
    begin
      insert into public.link_tokens (household_id, member_id, code_hash, created_by, expires_at)
      values (p_household_id, null, private.hash_invite_code(new_code),
              private.my_member_id(p_household_id), new_expires);
      exit;
    exception when unique_violation then
      if tries >= 5 then raise; end if;
    end;
  end loop;

  return query select new_code, new_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_link_token: en kode uten member_id kobler enheten som familieskjerm.
-- Ellers uendret fra 20261117190000_child_devices.sql.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_link_token(p_code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tok public.link_tokens;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous_required' using errcode = 'P0001';
  end if;

  -- En enhet er enten et barn eller en familieskjerm, aldri begge.
  if exists (select 1 from public.members m where m.auth_user_id = uid)
     or exists (select 1 from public.household_displays d where d.auth_user_id = uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('redeem_link_token:' || uid::text));

  delete from public.link_attempts a
  where a.user_id = uid and a.attempted_at <= now() - interval '15 minutes';

  if (select count(*) from public.link_attempts a where a.user_id = uid) >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select * into tok
  from public.link_tokens t
  where t.code_hash = private.hash_invite_code(p_code)
    and t.used_at is null
    and t.expires_at > now()
  for update;

  if not found then
    insert into public.link_attempts (user_id) values (uid);
    return null;
  end if;

  if tok.member_id is null then
    insert into public.household_displays (household_id, auth_user_id, created_by)
    values (tok.household_id, uid, tok.created_by);
  else
    update public.members m
    set auth_user_id = uid
    where m.id = tok.member_id and m.role = 'child' and m.auth_user_id is null;

    if not found then
      insert into public.link_attempts (user_id) values (uid);
      return null;
    end if;
  end if;

  update public.link_tokens set used_at = now() where id = tok.id;

  return tok.household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- unlink_display: en voksen kobler fra en skjerm. Raden forsvinner, og den anonyme brukeren
-- slettes med sesjonene sine. Skjermen ser det på at get_family_board gir null.
-- ---------------------------------------------------------------------------
create function public.unlink_display(p_display_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  d public.household_displays;
begin
  select * into d from public.household_displays where id = p_display_id for update;

  if not found or not private.is_adult(d.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  delete from public.household_displays where id = d.id;
  perform private.delete_anonymous_users(array[d.auth_user_id]);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_family_board: alt familieskjermen får lese. null hvis kalleren ikke er en skjerm.
--
-- Viktig: today_tasks og today_completions er security_invoker, og her kjører vi som eieren av
-- funksjonen. RLS gjelder dermed ikke, så hver spørring MÅ filtrere på husstanden.
--
-- Bare feltene skjermen trenger: ikke fødselsår, auth_user_id, oppgavebeskrivelser eller saldo.
-- recorded_by vises bare når skjermen selv registrerte, så voksnes bruker-id ikke lekker.
-- ---------------------------------------------------------------------------
create function public.get_family_board()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  hid uuid := private.my_display_household();
begin
  if hid is null then
    return null;
  end if;

  return jsonb_build_object(
    'household_id', hid,
    'household_name', (select h.name from public.households h where h.id = hid),
    'today', private.household_today(hid),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'household_id', m.household_id,
        'role', m.role,
        'display_name', m.display_name,
        'avatar', m.avatar,
        'avatar_mode', m.avatar_mode,
        'photo_path', case when m.avatar_mode = 'photo' then m.photo_path end
      ) order by m.role, m.created_at)
      from public.members m
      where m.household_id = hid
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'household_id', t.household_id,
        'title', t.title,
        'assigned_member_id', t.assigned_member_id,
        'reward_nok', t.reward_nok,
        'recurrence_type', t.recurrence_type,
        'recurrence_unit', t.recurrence_unit,
        'recurrence_every', t.recurrence_every,
        'weekdays', t.weekdays,
        'month_day', t.month_day,
        'month', t.month,
        'job_repeats', t.job_repeats,
        'job_member_ids', t.job_member_ids,
        'season_start_month', t.season_start_month,
        'season_end_month', t.season_end_month,
        'next_due_on', t.next_due_on,
        'is_overdue', t.is_overdue,
        'is_month_task', t.is_month_task
      ) order by t.next_due_on nulls last, t.title)
      from public.today_tasks t
      where t.household_id = hid
    ), '[]'::jsonb),
    'completions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'household_id', c.household_id,
        'task_id', c.task_id,
        'completed_by_member_id', c.completed_by_member_id,
        'recorded_by', case when c.recorded_by = auth.uid() then c.recorded_by end,
        'completed_at', c.completed_at,
        'reward_nok', c.reward_nok,
        'status', c.status,
        'title', c.title,
        'assigned_member_id', c.assigned_member_id,
        'recurrence_type', c.recurrence_type,
        'job_member_ids', c.job_member_ids,
        'is_latest', c.is_latest
      ) order by c.completed_at)
      from public.today_completions c
      where c.household_id = hid
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_task: en familieskjerm kan krysse av for personen oppgaven gjelder.
-- Ellers uendret fra 20261117210000_reward_approval.sql.
-- ---------------------------------------------------------------------------
create or replace function public.complete_task(p_task_id uuid, p_member_id uuid)
returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer,
               status public.completion_status)
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

  select m.id, m.text into fb_id, fb_text
  from public.feedback_messages m
  where m.is_active
    and (hh_tone = 'both' or m.tone = hh_tone::text)
    and m.audience in ('any', doer.role::text::public.audience)
    and (m.category is null or m.category = t.category)
  order by
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

  return query select new_id, fb_text, new_due, reward, new_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- undo_completion: en familieskjerm kan angre det den selv registrerte.
-- Ellers uendret fra 20261117210000_reward_approval.sql.
-- ---------------------------------------------------------------------------
create or replace function public.undo_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c          public.task_completions;
  caller     public.members;
  is_display boolean := false;
begin
  select * into c from public.task_completions where id = p_completion_id;
  if not found then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = c.household_id and auth_user_id = auth.uid();
  if not found then
    is_display := private.my_display_household() is not distinct from c.household_id
                  and private.my_display_household() is not null;
    if not is_display then
      raise exception 'completion_not_found' using errcode = 'P0001';
    end if;
  end if;

  -- is_display først: for en skjerm er caller.role null, og null <> 'adult' er ikke sant.
  if (is_display or caller.role <> 'adult') and c.recorded_by is distinct from auth.uid() then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.status = 'rejected' then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  perform 1 from public.tasks where id = c.task_id for update;

  if exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at and x.status <> 'rejected'
  ) then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.completed_at < now() - interval '10 minutes' then
    raise exception 'undo_expired' using errcode = 'P0001';
  end if;

  delete from public.task_completions where id = c.id;
  update public.tasks
  set next_due_on = c.due_on,
      archived_at = case when recurrence_type = 'job' and not job_repeats
                         then null else archived_at end
  where id = c.task_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_my_account_data: sletter også familieskjermenes anonyme brukere med husstanden.
-- Ellers uendret fra 20261117190000_child_devices.sql.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account_data()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  me record;
  other_adults int;
  device_users uuid[];
begin
  select m.id, m.household_id, m.role
    into me
  from public.members m
  where m.auth_user_id = auth.uid();

  if not found or me.role <> 'adult' then
    return;
  end if;

  perform 1 from public.households h where h.id = me.household_id for update;

  select count(*)
    into other_adults
  from public.members m
  where m.household_id = me.household_id
    and m.role = 'adult'
    and m.id <> me.id;

  if other_adults = 0 then
    -- Hentes før husstanden slettes: da forsvinner koblingene.
    select coalesce(array_agg(u.id), '{}')
      into device_users
    from (
      select m.auth_user_id as id
      from public.members m
      where m.household_id = me.household_id
        and m.role = 'child'
        and m.auth_user_id is not null
      union all
      select d.auth_user_id
      from public.household_displays d
      where d.household_id = me.household_id
    ) u;

    delete from public.households h where h.id = me.household_id;
    perform private.delete_anonymous_users(device_users);
  else
    delete from public.members m where m.id = me.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rettigheter
-- ---------------------------------------------------------------------------
revoke execute on function private.my_display_household()        from public, anon;
grant  execute on function private.my_display_household()        to authenticated;
revoke execute on function private.display_can_read_photo(text)  from public, anon;
grant  execute on function private.display_can_read_photo(text)  to authenticated;

revoke execute on function public.create_display_link_token(uuid) from public, anon;
grant  execute on function public.create_display_link_token(uuid) to authenticated;
revoke execute on function public.unlink_display(uuid)            from public, anon;
grant  execute on function public.unlink_display(uuid)            to authenticated;
revoke execute on function public.get_family_board()              from public, anon;
grant  execute on function public.get_family_board()              to authenticated;
