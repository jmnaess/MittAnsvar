-- Steg 6: invitere en annen voksen til husstanden.
-- Se docs/DATABASE.md §1 (invites, invite_attempts) og §5 (RLS og RPC).
--
-- Samme mønster som QR-tokenet for barn (link_tokens, steg 15): bare SHA-256-hashen lagres,
-- koden kan brukes én gang og utløper. Forskjellen er at koden er kort (8 tegn) så den kan
-- skrives inn for hånd, og at den gjelder i 48 timer. Derfor er det også en sperre mot gjetting.
--
-- Feil kastes med errcode P0001 og en fast nøkkel som melding (se src/lib/errors.ts):
--   create_invite: not_authenticated, not_adult, subscription_required
--   accept_invite: not_authenticated, anonymous_not_allowed, already_in_household,
--                  too_many_attempts. Feil, utløpt, brukt eller tilbaketrukket kode gir
--                  returverdien null (= invite_invalid), se forklaringen ved funksjonen.

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------
create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- SHA-256 av den normaliserte koden. Klarteksten lagres aldri.
  code_hash    bytea not null unique,
  -- Forlater den som inviterte husstanden, forsvinner invitasjonene deres også.
  created_by   uuid not null references public.members (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  used_by      uuid references public.members (id) on delete set null
);

create index invites_household_id_idx on public.invites (household_id);

-- Feilede forsøk på å løse inn en kode. Brukes bare til sperren i accept_invite.
create table public.invite_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index invite_attempts_user_id_idx on public.invite_attempts (user_id, attempted_at);

-- ---------------------------------------------------------------------------
-- Rettigheter og RLS
-- ---------------------------------------------------------------------------
-- Klienten kan lese alt unntatt hashen, og slette (= trekke tilbake). Ingen insert/update:
-- det skjer bare i RPC-ene under.
revoke all on public.invites from anon, authenticated;
grant select (id, household_id, created_by, created_at, expires_at, used_at, used_by)
  on public.invites to authenticated;
grant delete on public.invites to authenticated;

-- Helt stengt for klienten: ingen rettigheter og ingen policyer.
revoke all on public.invite_attempts from anon, authenticated;

alter table public.invites         enable row level security;
alter table public.invite_attempts enable row level security;

-- Bare voksne i husstanden ser invitasjonene. Barn og andre husstander ser ingenting.
create policy invites_select on public.invites
  for select to authenticated
  using (private.is_adult(household_id));

-- Trekke tilbake = slette. En brukt invitasjon beholdes som historikk.
create policy invites_delete on public.invites
  for delete to authenticated
  using (private.is_adult(household_id) and used_at is null);

-- ---------------------------------------------------------------------------
-- Hjelpefunksjoner
-- ---------------------------------------------------------------------------
-- Alfabetet: 31 tegn, uten 0/O og 1/I/L som lett forveksles.
-- Normalisering: store bokstaver, og alt som ikke er i alfabetet (mellomrom, bindestrek) fjernes.
-- Samme regel finnes i src/features/household/inviteCode.ts.
create function private.normalize_invite_code(p_code text)
returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(upper(coalesce(p_code, '')), '[^ABCDEFGHJKMNPQRSTUVWXYZ2-9]', '', 'g');
$$;

create function private.hash_invite_code(p_code text)
returns bytea
language sql immutable set search_path = ''
as $$
  select sha256(convert_to(private.normalize_invite_code(p_code), 'UTF8'));
$$;

-- 8 tilfeldige tegn fra alfabetet. Byte ≥ 248 (= 8 × 31) forkastes, ellers ville de første
-- tegnene i alfabetet vært litt mer sannsynlige enn de siste.
create function private.generate_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  b int;
begin
  while char_length(result) < 8 loop
    b := get_byte(extensions.gen_random_bytes(1), 0);
    if b < 248 then
      result := result || substr(alphabet, (b % 31) + 1, 1);
    end if;
  end loop;
  return result;
end;
$$;

revoke execute on function private.normalize_invite_code(text), private.hash_invite_code(text),
  private.generate_invite_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_invite: en voksen lager en kode. Klarteksten returneres bare her.
-- ---------------------------------------------------------------------------
create function public.create_invite(p_household_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer set search_path = ''
as $$
declare
  new_code text;
  new_expires timestamptz := now() + interval '48 hours';
  tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- Dekker barn, anonyme enheter og voksne i andre husstander.
  if not private.is_adult(p_household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if not private.household_has_access(p_household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  -- To like koder er svært usannsynlig, men unique(code_hash) stopper det. Da prøver vi igjen.
  loop
    tries := tries + 1;
    new_code := private.generate_invite_code();
    begin
      insert into public.invites (household_id, code_hash, created_by, expires_at)
      values (p_household_id, private.hash_invite_code(new_code),
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
-- accept_invite: en innlogget voksen uten husstand blir med via koden.
--
-- Hvorfor null i stedet for en feil ved feil kode? Kaster funksjonen en feil, rulles hele
-- transaksjonen tilbake, også raden i invite_attempts. Da ville sperren aldri slått inn.
-- Appen gjør null om til feilnøkkelen invite_invalid (src/features/household/api.ts).
-- invite_invalid dekker feil, utløpt, brukt og tilbaketrukket kode, så vi ikke røper hvilken.
-- ---------------------------------------------------------------------------
create function public.accept_invite(p_code text, p_display_name text, p_avatar text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
  new_member_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous_not_allowed' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.members m where m.auth_user_id = uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  -- Ett forsøk om gangen per bruker. Ellers kunne mange samtidige kall alle telt 4 forsøk
  -- og sluppet gjennom sperren.
  perform pg_advisory_xact_lock(hashtext('accept_invite:' || uid::text));

  -- Sperre: maks 5 feilede forsøk per 15 minutter. Gamle forsøk ryddes bort samtidig.
  delete from public.invite_attempts a
  where a.user_id = uid and a.attempted_at <= now() - interval '15 minutes';

  if (select count(*) from public.invite_attempts a where a.user_id = uid) >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select * into inv
  from public.invites i
  where i.code_hash = private.hash_invite_code(p_code)
    and i.used_at is null
    and i.expires_at > now()
  for update;

  if not found then
    insert into public.invite_attempts (user_id) values (uid);
    return null;
  end if;

  insert into public.members (household_id, role, display_name, avatar, auth_user_id)
  values (inv.household_id, 'adult', btrim(p_display_name), p_avatar, uid)
  returning id into new_member_id;

  update public.invites
  set used_at = now(), used_by = new_member_id
  where id = inv.id;

  return inv.household_id;
exception
  -- Samme bruker i to samtidige kall: unique(auth_user_id) stopper det andre.
  when unique_violation then
    raise exception 'already_in_household' using errcode = 'P0001';
end;
$$;

revoke execute on function public.create_invite(uuid) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;
revoke execute on function public.accept_invite(text, text, text) from public, anon;
grant execute on function public.accept_invite(text, text, text) to authenticated;
