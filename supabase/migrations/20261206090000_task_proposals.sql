-- Barn foreslår oppgaver og spør om lønn. Se docs/DATABASE.md (task_proposals) og §5.
--
-- Barnet sender et forslag («Ryddet boden», gjort, ønsker 30 kr). En voksen godkjenner
-- (beløpet kan endres eller settes til 0) eller avslår.
--   Gjort:        godkjenning lager en engangsjobb for barnet og krysser den av via
--                 complete_task (uendret). Kalleren er voksen, så lønnen er godkjent med én gang,
--                 og jobben arkiveres av complete_task.
--   Ikke gjort:   godkjenning lager en engangsoppgave til barnet for i dag, med lønn hvis beløp
--                 er satt. Barnet krysser av som vanlig (med lønn: «venter» på godkjenning).
--
-- Barnet skriver og leser bare via RPC. Voksne leser alle i husstanden (RLS). Familieskjermen
-- og andre husstander ser ingenting. Avgjorte forslag slettes etter 30 dager (fritekst fra barn).

-- ---------------------------------------------------------------------------
-- Husstandsinnstilling: «Barn kan foreslå oppgaver»
-- ---------------------------------------------------------------------------
alter table public.households
  add column child_proposals_enabled boolean not null default true;

-- RLS på households: bare voksne kan oppdatere.
grant update (child_proposals_enabled) on public.households to authenticated;

-- ---------------------------------------------------------------------------
-- Tabell
-- ---------------------------------------------------------------------------
create type public.proposal_status as enum ('pending', 'approved', 'rejected');

create table public.task_proposals (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households on delete cascade,
  member_id            uuid not null,
  title                text not null,
  is_done              boolean not null,
  wants_reward         boolean not null,
  proposed_nok         integer null,
  status               public.proposal_status not null default 'pending',
  approved_nok         integer null,
  decided_by_member_id uuid null references public.members on delete set null,
  decided_at           timestamptz null,
  task_id              uuid null references public.tasks on delete set null,
  created_at           timestamptz not null default now(),

  -- Slettes med barneprofilen (GDPR), og barnet er alltid i samme husstand.
  constraint task_proposals_member_fkey foreign key (household_id, member_id)
    references public.members (household_id, id) on delete cascade,
  constraint task_proposals_title_len
    check (char_length(title) between 1 and 60 and title = btrim(title)),
  constraint task_proposals_proposed
    check (proposed_nok is null or (wants_reward and proposed_nok between 1 and 200)),
  constraint task_proposals_approved
    check (approved_nok is null or (status = 'approved' and approved_nok between 1 and 10000)),
  constraint task_proposals_decided
    check ((status = 'pending') = (decided_at is null)),
  constraint task_proposals_rejected
    check (status <> 'rejected' or task_id is null)
  -- Ingen check på «godkjent ⇒ task_id»: når husstanden slettes, kan cascade sette task_id
  -- til null før forslaget selv slettes.
);

create index task_proposals_member_idx
  on public.task_proposals (household_id, member_id, created_at desc);
create index task_proposals_pending_idx
  on public.task_proposals (household_id) where status = 'pending';

alter table public.task_proposals enable row level security;

revoke all on public.task_proposals from public, anon, authenticated;
grant select on public.task_proposals to authenticated;

-- Bare voksne leser direkte. Barnet leser egne via list_my_task_proposals. Familieskjermen er
-- ikke medlem, så is_adult er false.
create policy task_proposals_select on public.task_proposals for select to authenticated
  using (private.is_adult(household_id));

-- ---------------------------------------------------------------------------
-- submit_task_proposal: barnet sender et forslag
-- ---------------------------------------------------------------------------
create function public.submit_task_proposal(p_title text, p_is_done boolean,
                                            p_wants_reward boolean,
                                            p_proposed_nok integer default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  me      public.members;
  enabled boolean;
  title   text := btrim(coalesce(p_title, ''));
  waiting int;
  new_id  uuid;
begin
  -- Låser barnets rad, så to samtidige kall ikke begge slipper forbi grensen.
  select * into me from public.members
  where auth_user_id = auth.uid() and role = 'child'
  for update;
  if not found then
    raise exception 'not_child' using errcode = 'P0001';
  end if;

  if not private.household_has_access(me.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select h.child_proposals_enabled into enabled from public.households h where h.id = me.household_id;
  if not enabled then
    raise exception 'proposals_disabled' using errcode = 'P0001';
  end if;

  if char_length(title) not between 1 and 60 or p_is_done is null or p_wants_reward is null then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;

  if p_proposed_nok is not null and (not p_wants_reward or p_proposed_nok not between 1 and 200) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select count(*) into waiting from public.task_proposals
  where member_id = me.id and status = 'pending';
  if waiting >= 5 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;

  insert into public.task_proposals (household_id, member_id, title, is_done, wants_reward, proposed_nok)
  values (me.household_id, me.id, title, p_is_done, p_wants_reward, p_proposed_nok)
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_task_proposal(text, boolean, boolean, integer) from public, anon;
grant  execute on function public.submit_task_proposal(text, boolean, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_task_proposals: barnets egne, som venter eller ble avgjort de siste 3 dagene
-- ---------------------------------------------------------------------------
create function public.list_my_task_proposals()
returns table (id uuid, title text, is_done boolean, wants_reward boolean, proposed_nok integer,
               status public.proposal_status, approved_nok integer, created_at timestamptz,
               decided_at timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.title, p.is_done, p.wants_reward, p.proposed_nok, p.status, p.approved_nok,
         p.created_at, p.decided_at
  from public.task_proposals p
  join public.members m on m.id = p.member_id
  where m.auth_user_id = auth.uid()
    and m.role = 'child'
    and (p.status = 'pending' or p.decided_at > now() - interval '3 days')
  order by p.created_at desc
$$;

revoke execute on function public.list_my_task_proposals() from public, anon;
grant  execute on function public.list_my_task_proposals() to authenticated;

-- ---------------------------------------------------------------------------
-- decide_task_proposal: en voksen godkjenner eller avslår
-- Returnerer oppgaven som ble laget (null ved avslag).
-- ---------------------------------------------------------------------------
create function public.decide_task_proposal(p_proposal_id uuid, p_approve boolean,
                                            p_amount_nok integer default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  p        public.task_proposals;
  me_id    uuid;
  amount   integer;
  new_task uuid;
begin
  select * into p from public.task_proposals where id = p_proposal_id for update;
  if not found or not private.is_adult(p.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if not private.household_has_access(p.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  if p.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  me_id := private.my_member_id(p.household_id);

  if not coalesce(p_approve, false) then
    update public.task_proposals
    set status = 'rejected', decided_by_member_id = me_id, decided_at = now()
    where id = p.id;
    return null;
  end if;

  -- 0 eller tomt = ingen lønn.
  amount := nullif(coalesce(p_amount_nok, 0), 0);
  if amount is not null and amount not between 1 and 10000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  if p.is_done then
    -- Engangsjobb bare for barnet. complete_task arkiverer den, så den står ikke i «Oppgaver».
    insert into public.tasks (household_id, title, category, recurrence_type, job_repeats,
                              job_member_ids, reward_nok)
    values (p.household_id, p.title, 'other', 'job', false, array[p.member_id], amount)
    returning id into new_task;

    -- Samme avkrysning som ellers. Kalleren er voksen: lønnen er godkjent med én gang.
    -- Resultatet (tilbakemeldingstekst og feiring) forkastes, så ingenting vises hos den voksne.
    perform public.complete_task(p_task_id => new_task, p_member_id => p.member_id,
                                 p_last_today => false);
  else
    -- Engangsoppgave til barnet for i dag. Barnet krysser av som vanlig.
    insert into public.tasks (household_id, title, category, assigned_member_id, recurrence_type,
                              once_on, reward_nok)
    values (p.household_id, p.title, 'other', p.member_id, 'once',
            private.household_today(p.household_id), amount)
    returning id into new_task;
  end if;

  update public.task_proposals
  set status = 'approved', approved_nok = amount, decided_by_member_id = me_id,
      decided_at = now(), task_id = new_task
  where id = p.id;

  return new_task;
end;
$$;

revoke execute on function public.decide_task_proposal(uuid, boolean, integer) from public, anon;
grant  execute on function public.decide_task_proposal(uuid, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Opprydding: avgjorte forslag slettes etter 30 dager (dataminimering, fritekst fra barn).
-- Oppgaven som ble laget, blir stående.
-- ---------------------------------------------------------------------------
create function private.delete_old_task_proposals(p_now timestamptz default now())
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.task_proposals
  where status <> 'pending' and decided_at < p_now - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function private.delete_old_task_proposals(timestamptz) from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('delete-old-task-proposals', '15 3 * * *',
                     'select private.delete_old_task_proposals()');
