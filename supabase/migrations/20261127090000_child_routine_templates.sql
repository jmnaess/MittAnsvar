-- Barnemaler: alderen sorterer forslagene i stedet for å skjule dem (se templates/routines.ts).
-- Alle barnemaler har nå aldersgrense. Bare malene endres: oppgaver laget fra dem røres ikke.

-- «Rydde av egen tallerken» var den eneste uten aldersgrense. Nå: småbarn.
update public.task_templates
set min_age = 3, max_age = 5
where slug = 'routine-kid-plate';

update public.task_templates
set title = 'Brette klær og pare sokker',
    description = 'Brett de rene klærne og legg dem i skapet. Finn sokkene som hører sammen, og par dem.',
    max_age = 14,
    reward_nok = 20
where slug = 'routine-kid-fold';

update public.task_templates
set reward_nok = 5
where slug = 'routine-kid-plants';

insert into public.task_templates
  (slug, title, description, category, audience, household_types, min_age, max_age, reward_nok,
   suggested_by_default, recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, sort_order)
values
  ('routine-kid-lunchbox', 'Smøre egen matpakke',
   'Smør skivene og legg dem i matboksen, gjerne med litt frukt eller grønt ved siden av.',
   'kitchen', 'child', '{family}', 6, 18, null, false, 'calendar', 'week', 1, '{1,2,3,4,5}', null, 255),
  ('routine-kid-school-bag', 'Pakke sekken og gymtøyet',
   'Bøker, lekser og drikkeflaske i sekken kvelden før, og gymtøyet de dagene det trengs. Da blir morgenen roligere.',
   'tidying', 'child', '{family}', 6, 12, null, false, 'calendar', 'week', 1, '{7,1,2,3,4}', null, 260),
  ('routine-kid-load-dishwasher', 'Sette inn i oppvaskmaskinen',
   'Skyll av tallerkener og glass, og sett dem inn i oppvaskmaskinen.',
   'kitchen', 'child', '{family}', 6, 13, 5, false, 'calendar', 'week', 1, '{1,2,3,4,5}', null, 265);

do $$
declare n int; c int;
begin
  select count(*) into n from public.task_templates where slug like 'routine-%';
  select count(*) into c from public.task_templates where slug like 'routine-%' and audience = 'child';
  if n <> 28 or c <> 18 then
    raise exception 'child_routine_templates: % rutinemaler og % barnemaler, ventet 28 og 18', n, c;
  end if;
end;
$$;
