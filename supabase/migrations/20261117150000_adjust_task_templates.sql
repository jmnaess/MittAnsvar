-- Justerer startsettet med maler fra *_task_templates.sql etter gjennomgang.
--
-- Malene finnes på slug, som er stabil. Hver endring må treffe nøyaktig én rad, ellers stopper
-- migrasjonen. Det fanger skrivefeil i stedet for at en endring stille ikke skjer.
--
-- Endringene gjelder bare malene. Oppgaver som allerede er aktivert, er kopier og beholder
-- den gamle forklaringen (se DATABASE.md §4).

create function pg_temp.expect_one_template(p_what text, p_count int)
returns void language plpgsql as $$
begin
  if p_count <> 1 then
    raise exception 'adjust_task_templates: «%» traff % rader, ventet 1', p_what, p_count;
  end if;
end;
$$;

do $$
declare n int;
begin
  update public.task_templates
  set description = 'Har utekranen egen stoppekran inne, steng den og åpne kranen ute så vannet renner ut. Har du frostsikker utekran, holder det å koble fra hageslangen, ellers kan vannet bli stående og fryse.'
  where slug = 'outdoor-tap-close';
  get diagnostics n = row_count;
  perform pg_temp.expect_one_template('outdoor-tap-close', n);

  update public.task_templates
  set description = 'Åpne stoppekranen inne hvis du har en, og så kranen ute. Se etter lekkasje både ute og inne. En frostsprengt kran kan lekke inn i veggen uten at det synes.'
  where slug = 'outdoor-tap-open';
  get diagnostics n = row_count;
  perform pg_temp.expect_one_template('outdoor-tap-open', n);

  update public.task_templates
  set description = 'Trykk på testknappen i sikringsskapet. Bryteren skal slå ut, og strømmen forsvinner på kursene den beskytter. Slå den på igjen. Slår den ikke ut, kontakt en elektriker.'
  where slug = 'earth-fault-breaker';
  get diagnostics n = row_count;
  perform pg_temp.expect_one_template('earth-fault-breaker', n);
end;
$$;

insert into public.task_templates
  (slug, title, description, category, household_types, housing_types,
   recurrence_type, recurrence_unit, recurrence_every, month, month_day, sort_order)
values
  ('kitchen-leak-check', 'Se etter lekkasje under kjøkkenbenk og ved oppvaskmaskin',
   'Se etter fukt, misfarging og svak lukt under vasken og rundt oppvaskmaskinen. Små lekkasjer oppdaget tidlig sparer store skader.',
   'kitchen', null, null, 'calendar', 'year', 1, 2, null, 10),

  ('ventilation-filter-spring', 'Bytt filter i ventilasjonsanlegget',
   'Gjelder boliger med balansert ventilasjon. Tette filtre gir dårligere luft og høyere strømforbruk. Sjekk anvisningen for anlegget ditt for riktig filter.',
   'maintenance', null, null, 'calendar', 'year', 1, 3, null, 30),

  ('ventilation-filter-autumn', 'Bytt filter i ventilasjonsanlegget',
   'Gjelder boliger med balansert ventilasjon. Tette filtre gir dårligere luft og høyere strømforbruk. Sjekk anvisningen for anlegget ditt for riktig filter.',
   'maintenance', null, null, 'calendar', 'year', 1, 9, null, 30);
