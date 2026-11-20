-- Bare eget navn for voksne.
-- members_update lar alle voksne endre alle i husstanden (barneprofiler, figur, bilde).
-- Navnet til en voksen skal bare den voksne selv kunne endre. RLS kan ikke sammenligne gammel
-- og ny verdi i én kolonne, så det gjøres med en trigger.
-- Uten innlogget bruker (auth.uid() er null: superbruker, service-rolle) gjelder ikke regelen.

create function private.guard_adult_display_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and old.role = 'adult'
     and old.auth_user_id is distinct from auth.uid()
     and new.display_name is distinct from old.display_name then
    raise exception 'not_own_name' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger members_guard_adult_display_name
  before update of display_name on public.members
  for each row execute function private.guard_adult_display_name();
