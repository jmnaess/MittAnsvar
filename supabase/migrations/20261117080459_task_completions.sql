-- Steg 5b: utføring av oppgaver, angring og tilbakemeldingstekster.
-- Se docs/DATABASE.md §3 (task_completions), §4 (feedback_messages) og §5 (RLS og RPC).
--
-- Hovedregler:
--   - Hver avkrysning er en ny rad i task_completions. Raden endres aldri, og slettes bare ved angring.
--   - All skriving skjer via RPC-ene complete_task og undo_completion. Klienten sender verken
--     dato eller frist: serveren setter completed_on i husstandens tidssone og beregner neste frist.
--   - complete_task velger også tilbakemeldingsteksten, i husstandens tone.

-- ---------------------------------------------------------------------------
-- Tilbakemeldingstekster (globale, les-bare for klienten)
-- ---------------------------------------------------------------------------
create type public.audience as enum ('adult', 'child', 'any');

create table public.feedback_messages (
  id        uuid primary key default gen_random_uuid(),
  -- Bare fact eller humor. «both» er et filter på husstanden, ikke en tone på en tekst.
  tone      text not null check (tone in ('fact', 'humor')),
  text      text not null unique check (char_length(text) between 1 and 200),
  audience  public.audience not null default 'any',
  -- Mest spesifikk: tekst for én kategori. null = generell. (template_id kommer med malene i steg 9.)
  category  text check (category in (
              'daily', 'cleaning', 'kitchen', 'laundry',
              'outdoor', 'maintenance', 'safety', 'other')),
  is_active boolean not null default true
);

revoke all on public.feedback_messages from anon, authenticated;
grant select on public.feedback_messages to authenticated;

alter table public.feedback_messages enable row level security;

create policy feedback_messages_select on public.feedback_messages
  for select to authenticated
  using (is_active);

-- Et lite startsett. Faktatekstene er generelle og ufarlige (ikke el eller brann).
-- Skal gjennomgås manuelt før lansering, og utvides til 80–100 tekster (ARCHITECTURE.md §7).
insert into public.feedback_messages (tone, audience, category, text) values
  -- Fakta for alle
  ('fact', 'any', null, 'Visste du at litt rydding hver dag tar mindre tid enn én stor ryddedag?'),
  ('fact', 'any', null, 'Visste du at små, faste rutiner er lettere å holde enn store forsetter?'),
  ('fact', 'any', null, 'Visste du at det i snitt tar rundt to måneder før en ny vane sitter?'),
  ('fact', 'any', null, 'Visste du at husstøv blant annet består av hudceller, tekstilfibre og jord fra skoene?'),
  ('fact', 'any', null, 'Visste du at noen minutter med gjennomtrekk gir bedre luft enn et vindu på gløtt hele dagen?'),
  ('fact', 'any', null, 'Visste du at det kjennes godt å krysse av fordi hjernen belønner deg for å fullføre noe?'),
  ('fact', 'any', null, 'Visste du at oppgaver som har en fast dag, er lettere å huske enn oppgaver «en gang snart»?'),
  -- Fakta for barn
  ('fact', 'child', null, 'Visste du at blekkspruter har tre hjerter?'),
  ('fact', 'child', null, 'Visste du at honning nesten aldri blir dårlig?'),
  ('fact', 'child', null, 'Visste du at kråker kan kjenne igjen ansikter?'),
  ('fact', 'child', null, 'Visste du at en flodhest ikke svømmer, men spretter langs bunnen?'),
  -- Fakta for voksne
  ('fact', 'adult', null, 'Visste du at kjøleskapet bør holde rundt 4 grader?'),
  ('fact', 'adult', null, 'Visste du at fryseren bør holde minus 18 grader?'),
  ('fact', 'adult', null, 'Visste du at sluk som renses jevnlig, sjeldnere blir tette og lukter mindre?'),
  ('fact', 'adult', null, 'Visste du at det er lettere å huske en oppgave når alle vet hvem som har ansvaret?'),
  -- Fakta for en kategori
  ('fact', 'any', 'cleaning', 'Visste du at det lønner seg å tørke støv før du støvsuger? Da blir støvet som faller ned, sugd opp.'),
  ('fact', 'any', 'kitchen',  'Visste du at en fuktig kjøkkenklut bør vaskes eller byttes ofte, fordi bakterier trives i den?'),
  -- Humor for alle
  ('humor', 'any', null, 'Hvor mange hybelkaniner fant du?'),
  ('humor', 'any', null, 'Strålende! Huset takker deg. Det kan bare ikke si det selv.'),
  ('humor', 'any', null, 'Én ting mindre å huske på. Hjernen din jubler.'),
  ('humor', 'any', null, 'Klapp deg selv på skulderen. Vi ville gjort det, men vi har ikke armer.'),
  ('humor', 'any', null, 'Superhelter bruker ikke alltid kappe.'),
  ('humor', 'any', null, 'Oppgaven er offisielt slått. Den hadde ingen sjanse.'),
  -- Humor for barn
  ('humor', 'child', null, 'High five! ✋'),
  ('humor', 'child', null, 'Du er jo helt rå!'),
  ('humor', 'child', null, 'Nivå opp! Du ble nettopp litt mer voksen. Bare litt.'),
  ('humor', 'child', null, 'Wow! Selv katten er imponert. Kanskje.'),
  -- Humor for voksne
  ('humor', 'adult', null, 'Gratulerer, du var voksen i dag også.'),
  ('humor', 'adult', null, 'Én oppgave mindre, én kopp kaffe nærmere.'),
  ('humor', 'adult', null, 'Hvis husarbeid var en idrett, hadde du tatt medalje i dag.'),
  ('humor', 'adult', null, 'Huset er fornøyd. Du kan sette deg ned nå.'),
  -- Humor for en kategori
  ('humor', 'any', 'cleaning', 'Støvet ga opp uten kamp.'),
  ('humor', 'any', 'kitchen',  'Kjøkkenet skinner. Nesten for mye.');

-- ---------------------------------------------------------------------------
-- Utføringer
-- ---------------------------------------------------------------------------

-- Trengs for den sammensatte fremmednøkkelen under.
alter table public.tasks
  add constraint tasks_household_id_id_key unique (household_id, id);

create table public.task_completions (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid not null references public.households (id) on delete cascade,
  task_id                uuid not null,
  -- Hvem som gjorde det. Slettes med barneprofilen (GDPR).
  completed_by_member_id uuid not null,
  -- Hvem som var innlogget og registrerte det (i kiosk: den voksne).
  recorded_by            uuid references auth.users (id) on delete set null,
  -- Lokal dato i husstandens tidssone. Settes av complete_task, aldri av klienten.
  completed_on           date not null,
  completed_at           timestamptz not null default now(),
  -- Fristen denne avkrysningen dekket. Ved angring settes oppgavens frist tilbake hit.
  due_on                 date,
  feedback_message_id    uuid references public.feedback_messages (id) on delete set null,

  -- Sammensatte FK-er: oppgaven og medlemmet må høre til samme husstand som raden.
  constraint task_completions_task_fk
    foreign key (household_id, task_id)
    references public.tasks (household_id, id) on delete cascade,
  constraint task_completions_member_fk
    foreign key (household_id, completed_by_member_id)
    references public.members (household_id, id) on delete cascade
);

create index task_completions_task_idx on public.task_completions (task_id, completed_at desc);
create index task_completions_household_idx on public.task_completions (household_id, completed_on);
create index task_completions_member_idx on public.task_completions (household_id, completed_by_member_id);

revoke all on public.task_completions from anon, authenticated;
grant select on public.task_completions to authenticated;
-- Ingen insert/update/delete: skjer via complete_task og undo_completion.

alter table public.task_completions enable row level security;

create policy task_completions_select on public.task_completions
  for select to authenticated
  using (household_id in (select private.my_household_ids()));

-- ---------------------------------------------------------------------------
-- complete_task: kryss av en oppgave
--
-- Feil (errcode P0001, nøkkel som melding, oversettes i src/lib/errors.ts):
--   task_not_found        oppgaven finnes ikke, er arkivert, eller er i en annen husstand
--                         (samme feil, så man ikke kan finne ut om en id finnes)
--   subscription_required prøvetiden er over og det finnes ikke abonnement
--   invalid_member        medlemmet er ikke i husstanden, eller et barn krysser av for en annen
-- ---------------------------------------------------------------------------
create function public.complete_task(p_task_id uuid, p_member_id uuid)
returns table (completion_id uuid, feedback_text text, next_due_on date)
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
begin
  -- Låser oppgaveraden: to samtidige avkrysninger av samme oppgave venter på hverandre,
  -- så den andre ser fristen den første satte.
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

  select feedback_tone into hh_tone from public.households where id = t.household_id;
  today   := private.household_today(t.household_id);
  new_due := private.compute_next_due(t, today);

  -- Tilbakemelding: husstandens tone, målgruppen til den som gjorde det, og samme kategori
  -- eller generell. Sortering: ikke blant de 20 sist viste i husstanden først, deretter
  -- kategori-spesifikk foran generell, og tilfeldig innenfor det. Er alle vist nylig,
  -- gjentas en tekst i stedet for at det ikke kommer noen.
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

  -- clock_timestamp() i stedet for now(): to avkrysninger i samme transaksjon får ulike tider,
  -- så «siste avkrysning» i undo_completion alltid er entydig.
  insert into public.task_completions
    (household_id, task_id, completed_by_member_id, recorded_by,
     completed_on, completed_at, due_on, feedback_message_id)
  values
    (t.household_id, t.id, doer.id, auth.uid(),
     today, clock_timestamp(), t.next_due_on, fb_id)
  returning id into new_id;

  update public.tasks set next_due_on = new_due where id = t.id;

  return query select new_id, fb_text, new_due;
end;
$$;

-- ---------------------------------------------------------------------------
-- undo_completion: angre en avkrysning
--
-- Bare den siste avkrysningen på en oppgave, innen 10 minutter, av en voksen eller av den
-- som registrerte den. Raden slettes og oppgavens frist settes tilbake til due_on.
--
-- Feil (errcode P0001):
--   completion_not_found  finnes ikke, eller i en annen husstand
--   undo_not_allowed      ikke den siste avkrysningen, eller et barn angrer en annens
--   undo_expired          mer enn 10 minutter siden
-- ---------------------------------------------------------------------------
create function public.undo_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c      public.task_completions;
  caller public.members;
begin
  select * into c from public.task_completions where id = p_completion_id;
  if not found then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = c.household_id and auth_user_id = auth.uid();
  if not found then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  if caller.role <> 'adult' and c.recorded_by is distinct from auth.uid() then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  -- Lås oppgaven, så ingen krysser av samtidig mens vi sjekker «siste».
  perform 1 from public.tasks where id = c.task_id for update;

  if exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at
  ) then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.completed_at < now() - interval '10 minutes' then
    raise exception 'undo_expired' using errcode = 'P0001';
  end if;

  delete from public.task_completions where id = c.id;
  update public.tasks set next_due_on = c.due_on where id = c.task_id;
end;
$$;

revoke execute on function public.complete_task(uuid, uuid) from public, anon;
grant execute on function public.complete_task(uuid, uuid) to authenticated;
revoke execute on function public.undo_completion(uuid) from public, anon;
grant execute on function public.undo_completion(uuid) to authenticated;
