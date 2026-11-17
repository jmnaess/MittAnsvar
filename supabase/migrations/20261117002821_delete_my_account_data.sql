-- Steg 3b: opprydding i databasen når en bruker sletter kontoen sin.
-- Kalles av Edge Function delete-account FØR auth-brukeren slettes.
-- Se docs/ARCHITECTURE.md §5 (Sletting) og docs/DATABASE.md §1 (members.auth_user_id).
--
-- Regler:
--   - Ingen medlemskap:            ingenting skjer (trygt å kalle flere ganger).
--   - Barn (anonym enhet):         ingenting skjer. Barneprofilen tilhører husstanden;
--                                  auth_user_id settes til null av FK-en når auth-brukeren slettes.
--   - Siste voksne i husstanden:   hele husstanden slettes (members m.m. følger med via cascade).
--   - Det finnes andre voksne:     bare brukerens egen members-rad slettes.
--
-- Ingen parametere: funksjonen bruker auth.uid(), så man kan bare slette sine egne data.

create function public.delete_my_account_data()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  me record;
  other_adults int;
begin
  select m.id, m.household_id, m.role
    into me
  from public.members m
  where m.auth_user_id = auth.uid();

  if not found or me.role <> 'adult' then
    return;
  end if;

  -- Lås husstandsraden før vi teller voksne. Sletter to voksne samtidig, venter den
  -- ene her til den andre er ferdig, og tellingen under (en ny spørring) ser da at
  -- den første er borte. Uten låsen kunne begge telle «én annen voksen», bare slette
  -- sin egen rad, og etterlate en husstand uten voksne.
  perform 1 from public.households h where h.id = me.household_id for update;

  select count(*)
    into other_adults
  from public.members m
  where m.household_id = me.household_id
    and m.role = 'adult'
    and m.id <> me.id;

  if other_adults = 0 then
    delete from public.households h where h.id = me.household_id;
  else
    delete from public.members m where m.id = me.id;
  end if;
end;
$$;

revoke execute on function public.delete_my_account_data() from public, anon;
grant execute on function public.delete_my_account_data() to authenticated;
