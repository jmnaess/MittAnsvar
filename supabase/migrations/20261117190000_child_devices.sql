-- Steg 10a: barnas egen enhet. Se docs/ARCHITECTURE.md §3 og docs/DATABASE.md §1 og §5.
--
-- Flyt:
--   1. En voksen lager en kort kode for et barn (create_link_token). Koden vises som QR og tekst.
--   2. Barnets enhet logger inn anonymt og løser inn koden (redeem_link_token).
--      Da settes members.auth_user_id til den anonyme brukeren, og RLS gir barnets tilgang.
--   3. En voksen kan koble fra (unlink_member_device). Den anonyme brukeren slettes, og med den
--      sesjonene, så barnet logges ut.
--
-- Samme mønster som invitasjoner (20261117120000_invites.sql): bare hashen lagres, koden kan
-- brukes én gang, den utløper, og det er en sperre mot gjetting. Samme alfabet og generator.
-- Forskjellen er at koden bare gjelder i 10 minutter, og at den kobler en enhet til et barn.
--
-- I tillegg strammes tilgangen for barn inn:
--   - complete_task: et barn kan bare krysse av egne og felles oppgaver, og jobber som gjelder det.
--   - Et barn ser bare egne avkrysninger, utbetalinger og egen saldo, ikke søsknenes.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   create_link_token:    not_adult, invalid_member, already_linked
--   redeem_link_token:    not_authenticated, anonymous_required, already_in_household,
--                         too_many_attempts. Feil, utløpt eller brukt kode gir null (= link_invalid).
--   unlink_member_device: not_adult, invalid_member

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------
create table public.link_tokens (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Barnet som skal kobles. Slettes barnet, forsvinner koden.
  member_id    uuid not null references public.members (id) on delete cascade,
  -- SHA-256 av den normaliserte koden. Klarteksten lagres aldri.
  code_hash    bytea not null unique,
  created_by   uuid not null references public.members (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz
);

create index link_tokens_member_id_idx on public.link_tokens (member_id);

-- Feilede forsøk på å løse inn en kode. Brukes bare til sperren i redeem_link_token.
create table public.link_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index link_attempts_user_id_idx on public.link_attempts (user_id, attempted_at);

-- Helt stengt for klienten: ingen rettigheter og ingen policyer. Alt skjer via RPC-ene under.
revoke all on public.link_tokens   from anon, authenticated;
revoke all on public.link_attempts from anon, authenticated;
alter table public.link_tokens   enable row level security;
alter table public.link_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- create_link_token: en voksen lager en kode for et barn. Klarteksten returneres bare her.
-- Ett barn har én enhet: er barnet allerede koblet, må enheten kobles fra først.
-- ---------------------------------------------------------------------------
create function public.create_link_token(p_member_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer set search_path = ''
as $$
declare
  child       public.members;
  new_code    text;
  new_expires timestamptz := now() + interval '10 minutes';
  tries       int := 0;
begin
  select * into child from public.members where id = p_member_id;

  -- Kalleren må være voksen i barnets husstand. Sjekkes før alt annet, så en annen husstand
  -- ikke kan finne ut om en id finnes.
  if not found or not private.is_adult(child.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if child.role <> 'child' then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if child.auth_user_id is not null then
    raise exception 'already_linked' using errcode = 'P0001';
  end if;

  -- Bare den nyeste koden gjelder.
  delete from public.link_tokens t where t.member_id = child.id and t.used_at is null;

  loop
    tries := tries + 1;
    new_code := private.generate_invite_code();
    begin
      insert into public.link_tokens (household_id, member_id, code_hash, created_by, expires_at)
      values (child.household_id, child.id, private.hash_invite_code(new_code),
              private.my_member_id(child.household_id), new_expires);
      exit;
    exception when unique_violation then
      if tries >= 5 then raise; end if;
    end;
  end loop;

  return query select new_code, new_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_link_token: barnets anonyme bruker løser inn koden og blir koblet til barneprofilen.
--
-- Null i stedet for en feil ved feil kode, av samme grunn som i accept_invite: en kastet feil
-- ville rullet tilbake raden i link_attempts, og da ville sperren aldri slått inn.
-- ---------------------------------------------------------------------------
create function public.redeem_link_token(p_code text)
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

  -- Bare anonyme brukere kan bli et barn. En voksen med e-postkonto skal aldri bli det.
  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous_required' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.members m where m.auth_user_id = uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  -- Ett forsøk om gangen per bruker, så samtidige kall ikke sniker seg forbi sperren.
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

  -- Barnet kan ha blitt koblet til en annen enhet i mellomtiden (bare én om gangen).
  update public.members m
  set auth_user_id = uid
  where m.id = tok.member_id and m.role = 'child' and m.auth_user_id is null;

  if not found then
    insert into public.link_attempts (user_id) values (uid);
    return null;
  end if;

  update public.link_tokens set used_at = now() where id = tok.id;

  return tok.household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hjelper: slett en anonym auth-bruker (barnets enhet).
-- Sesjoner og refresh-token slettes med brukeren (cascade i auth), så enheten logges ut.
-- «and is_anonymous» er et sikkerhetsnett: en voksens e-postkonto slettes aldri her.
-- ---------------------------------------------------------------------------
create function private.delete_anonymous_users(p_user_ids uuid[])
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users u where u.id = any (p_user_ids) and u.is_anonymous;
$$;

revoke execute on function private.delete_anonymous_users(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- unlink_member_device: en voksen kobler fra barnets enhet (f.eks. tapt mobil).
-- ---------------------------------------------------------------------------
create function public.unlink_member_device(p_member_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  child public.members;
begin
  select * into child from public.members where id = p_member_id for update;

  if not found or not private.is_adult(child.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if child.role <> 'child' then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if child.auth_user_id is null then
    return; -- allerede frakoblet: trygt å kalle igjen
  end if;

  update public.members set auth_user_id = null where id = child.id;
  perform private.delete_anonymous_users(array[child.auth_user_id]);
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_my_account_data: sletter også barnas anonyme brukere når hele husstanden slettes.
-- Ellers uendret (se 20261117002821_delete_my_account_data.sql).
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account_data()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  me record;
  other_adults int;
  child_users uuid[];
begin
  select m.id, m.household_id, m.role
    into me
  from public.members m
  where m.auth_user_id = auth.uid();

  if not found or me.role <> 'adult' then
    return;
  end if;

  -- Lås husstandsraden før vi teller voksne (se forklaringen i den første migrasjonen).
  perform 1 from public.households h where h.id = me.household_id for update;

  select count(*)
    into other_adults
  from public.members m
  where m.household_id = me.household_id
    and m.role = 'adult'
    and m.id <> me.id;

  if other_adults = 0 then
    -- Hentes før husstanden slettes: da forsvinner barneprofilene, og koblingen med dem.
    select coalesce(array_agg(m.auth_user_id), '{}')
      into child_users
    from public.members m
    where m.household_id = me.household_id
      and m.role = 'child'
      and m.auth_user_id is not null;

    delete from public.households h where h.id = me.household_id;
    perform private.delete_anonymous_users(child_users);
  else
    delete from public.members m where m.id = me.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_task: et barn kan bare krysse av egne og felles oppgaver, og jobber som gjelder det.
-- Ellers uendret fra 20261117170100_rewards_and_jobs.sql.
-- ---------------------------------------------------------------------------
create or replace function public.complete_task(p_task_id uuid, p_member_id uuid)
returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t        public.tasks;
  caller   public.members;
  doer     public.members;
  hh_tone  public.feedback_tone;
  today    date;
  new_due  date;
  fb_id    uuid;
  fb_text  text;
  new_id   uuid;
  reward   integer;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found or t.archived_at is not null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = t.household_id and auth_user_id = auth.uid();
  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.household_has_access(t.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select * into doer from public.members
  where id = p_member_id and household_id = t.household_id;
  if not found or (caller.role = 'child' and doer.id <> caller.id) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  -- Steg 10a: et barn kan ikke ta søskens oppgaver eller jobber for andre barn.
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
  new_due := private.compute_next_due(t, today);
  reward  := case when doer.role = 'child' then t.reward_nok end;

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
     completed_on, completed_at, due_on, feedback_message_id, reward_nok)
  values
    (t.household_id, t.id, doer.id, auth.uid(),
     today, clock_timestamp(), t.next_due_on, fb_id, reward)
  returning id into new_id;

  update public.tasks
  set next_due_on = new_due,
      archived_at = case when t.recurrence_type = 'job' and not t.job_repeats
                         then now() else archived_at end
  where id = t.id;

  return query select new_id, fb_text, new_due, reward;
end;
$$;

-- ---------------------------------------------------------------------------
-- Barn ser bare egne avkrysninger og utbetalinger. Voksne ser alt i husstanden.
-- ---------------------------------------------------------------------------
drop policy task_completions_select on public.task_completions;
create policy task_completions_select on public.task_completions
  for select to authenticated
  using (
    household_id in (select private.my_household_ids())
    and (private.is_adult(household_id)
         or completed_by_member_id = private.my_member_id(household_id))
  );

drop policy payouts_select on public.payouts;
create policy payouts_select on public.payouts
  for select to authenticated
  using (
    household_id in (select private.my_household_ids())
    and (private.is_adult(household_id) or member_id = private.my_member_id(household_id))
  );

-- ---------------------------------------------------------------------------
-- member_balances: et barn ser bare sin egen rad (ellers ville søsken vist 0 kr).
-- ---------------------------------------------------------------------------
create or replace view public.member_balances
with (security_invoker = true)
as
select m.id           as member_id,
       m.household_id,
       e.earned_nok,
       p.paid_nok,
       e.earned_nok - p.paid_nok as balance_nok
from public.members m
cross join lateral (
  select coalesce(sum(c.reward_nok), 0)::int as earned_nok
  from public.task_completions c
  where c.household_id = m.household_id and c.completed_by_member_id = m.id
) e
cross join lateral (
  select coalesce(sum(x.amount_nok), 0)::int as paid_nok
  from public.payouts x
  where x.household_id = m.household_id and x.member_id = m.id
) p
where m.role = 'child'
  and (private.is_adult(m.household_id) or m.auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Rettigheter
-- ---------------------------------------------------------------------------
revoke execute on function public.create_link_token(uuid)    from public, anon;
grant  execute on function public.create_link_token(uuid)    to authenticated;
revoke execute on function public.redeem_link_token(text)    from public, anon;
grant  execute on function public.redeem_link_token(text)    to authenticated;
revoke execute on function public.unlink_member_device(uuid) from public, anon;
grant  execute on function public.unlink_member_device(uuid) to authenticated;
