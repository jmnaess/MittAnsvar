-- Steg 16: startsett med rutinemaler for «Forslag til hverdagen». Se docs/DATABASE.md §4.
-- Kolonnene og activate_templates kom i *_routine_template_columns.sql.
--
-- 15 barnemaler (household_types {family}) i aldersgruppene 3–5, 6–8, 9–12 og 13+. Hvert barn
-- med fødselsår får 5–8 forslag, og 2–3 av dem er avhuket (suggested_by_default). Uten fødselsår:
-- bare «Rydde av egen tallerken», som ikke har aldersgrense. Den er avhuket bare for barn uten
-- fødselsår (det gjør appen, se templates/routines.ts).
-- 6 felles maler for alle husstander, 3 avhuket. 4 for par og enslige, ingen avhuket.
-- Lønn (reward_nok) bare på ekstra jobber, ikke på egne ting som å re opp senga.
-- Alle er fast kalender (dag, uke eller måned) uten periode, så de vises aldri i årshjulet.
-- Ingen bruker requires: «hverdagen» kommer før hjemprofilen i oppstarten.

insert into public.task_templates
  (slug, title, description, category, audience, household_types, min_age, max_age, reward_nok,
   suggested_by_default, recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, sort_order)
values
  -- -------------------------------------------------------------------------
  -- Barn
  -- -------------------------------------------------------------------------
  ('routine-kid-toys', 'Rydde lekene på plass',
   'Alle lekene tilbake i kassen eller hylla før kveldsmat. Små barn klarer mye når det er tydelig hvor ting skal.',
   'tidying', 'child', '{family}', 3, 5, null, true, 'calendar', 'day', 1, null, null, 110),
  ('routine-kid-laundry-basket', 'Legge skitne klær i skittentøyskurven',
   'Klærne som er brukt, går rett i kurven når man kler av seg. Da slipper noen å plukke dem opp fra gulvet.',
   'laundry', 'child', '{family}', 3, 5, null, true, 'calendar', 'day', 1, null, null, 120),
  ('routine-kid-help-table', 'Hjelpe til med å dekke bordet',
   'Legge frem bestikk og servietter til middag. En fin første jobb for de minste.',
   'kitchen', 'child', '{family}', 3, 5, null, false, 'calendar', 'day', 1, null, null, 130),
  ('routine-kid-plants', 'Vanne blomstene',
   'Kjenn med fingeren om jorda er tørr, og vann bare de som trenger det.',
   'other', 'child', '{family}', 3, 8, null, false, 'calendar', 'week', 1, '{7}', null, 140),
  ('routine-kid-plate', 'Rydde av egen tallerken etter middag',
   'Tallerken, glass og bestikk til benken eller rett i oppvaskmaskinen.',
   'kitchen', 'child', '{family}', null, null, null, false, 'calendar', 'day', 1, null, null, 150),
  ('routine-kid-bed', 'Re opp senga',
   'Dyne og pute på plass om morgenen. Det tar ett minutt og får rommet til å se ryddig ut.',
   'tidying', 'child', '{family}', 6, 18, null, true, 'calendar', 'day', 1, null, null, 160),
  ('routine-kid-set-table', 'Dekke bordet til middag',
   'Tallerkener, glass og bestikk til alle, og det som trengs av drikke og tilbehør.',
   'kitchen', 'child', '{family}', 6, 12, null, false, 'calendar', 'day', 1, null, null, 170),
  ('routine-kid-room', 'Rydde rommet',
   'Klær i skapet eller kurven, ting på plass og fritt gulv, så det går an å støvsuge.',
   'tidying', 'child', '{family}', 6, 18, null, true, 'calendar', 'week', 1, '{6}', null, 180),
  ('routine-kid-fold', 'Brette og legge bort egne klær',
   'Ta de rene klærne fra kurven, brett dem og legg dem i skapet.',
   'laundry', 'child', '{family}', 7, 10, null, false, 'calendar', 'week', 1, '{7}', null, 190),
  ('routine-kid-dishwasher', 'Tømme oppvaskmaskinen',
   'Sett tallerkener, glass og bestikk på plass. Skarpe kniver kan en voksen ta.',
   'kitchen', 'child', '{family}', 8, 13, 5, false, 'calendar', 'week', 1, '{1,3,5}', null, 200),
  ('routine-kid-trash', 'Bære ut søppelet',
   'Ta med restavfall, papir og plast ut, og sett i en ny pose.',
   'kitchen', 'child', '{family}', 9, 18, 10, true, 'calendar', 'week', 1, '{1,4}', null, 210),
  ('routine-kid-wash-clothes', 'Vaske egne klær',
   'Sorter etter farge, sjekk vaskemerkene og heng opp eller tørk når maskinen er ferdig.',
   'laundry', 'child', '{family}', 13, 18, null, false, 'calendar', 'week', 1, '{7}', null, 220),
  ('routine-kid-dinner', 'Lage middag',
   'Velg en rett, sjekk at det som trengs finnes, og lag middag til familien. Rydd kjøkkenet etterpå.',
   'kitchen', 'child', '{family}', 13, 18, 30, false, 'calendar', 'week', 1, '{3}', null, 230),
  ('routine-kid-vacuum-living', 'Støvsuge stua',
   'Flytt løse ting fra gulvet først, og ta med hjørnene og under sofaen.',
   'tidying', 'child', '{family}', 12, 18, 20, false, 'calendar', 'week', 1, '{6}', null, 240),
  ('routine-kid-bathroom-sink', 'Vaske servant og speil på badet',
   'Vask servanten og kranen, og tørk speilet med en klut uten striper.',
   'tidying', 'child', '{family}', 14, 18, 30, false, 'calendar', 'week', 1, '{7}', null, 250),

  -- -------------------------------------------------------------------------
  -- Felles (alle husstander)
  -- -------------------------------------------------------------------------
  ('routine-bathroom', 'Vaske badet',
   'Toalett, servant, speil og gulv. Fast dag gjør det lettere å holde det ved like.',
   'tidying', 'any', null, null, null, null, true, 'calendar', 'week', 1, '{6}', null, 10),
  ('routine-bedding', 'Skifte sengetøy',
   'Annenhver uke er vanlig. Vask på 60 grader hvis noen har allergi.',
   'laundry', 'any', null, null, null, null, true, 'calendar', 'week', 2, '{7}', null, 20),
  ('routine-floors', 'Støvsuge og vaske gulv',
   'Støvsug først, og vask gulvene der det trengs, som kjøkken og gang.',
   'tidying', 'any', null, null, null, null, true, 'calendar', 'week', 1, '{6}', null, 30),
  ('routine-meal-plan', 'Planlegge middagene for uka',
   'Bestem middagene, og skriv handlelisten samtidig. Det sparer både tid og penger.',
   'kitchen', 'adult', null, null, null, null, false, 'calendar', 'week', 1, '{7}', null, 40),
  ('routine-kitchen-deep', 'Vaske komfyr og kjøkkenbenk grundig',
   'Ta platetopp, benk, fronter og håndtak. Fett er lettest å få bort før det setter seg.',
   'kitchen', 'any', null, null, null, null, false, 'calendar', 'week', 1, '{3}', null, 50),
  ('routine-fridge-check', 'Gå gjennom kjøleskapet',
   'Kast det som er gått ut, og bruk det som snart går ut. Gjør det før dere handler.',
   'kitchen', 'any', null, null, null, null, false, 'calendar', 'week', 1, '{4}', null, 60),

  -- -------------------------------------------------------------------------
  -- Par og enslige
  -- -------------------------------------------------------------------------
  ('routine-laundry', 'Vaske og brette klær',
   'Én fast klesvask i uka hindrer at kurven renner over.',
   'laundry', 'any', '{couple,single}', null, null, null, false, 'calendar', 'week', 1, '{3}', null, 70),
  ('routine-trash-recycling', 'Ta ut søppel og pant',
   'Restavfall, papir og plast, og ta med panteflaskene neste gang du handler.',
   'kitchen', 'any', '{couple,single}', null, null, null, false, 'calendar', 'week', 1, '{4}', null, 80),
  ('routine-bills', 'Gå gjennom regninger og nettbank',
   'Sjekk at regningene er betalt eller lagt inn, og se over faste trekk og abonnementer.',
   'other', 'adult', '{couple,single}', null, null, null, false, 'calendar', 'month', 1, null, 20, 90),
  ('routine-plants', 'Vanne planter',
   'Kjenn om jorda er tørr. De fleste planter tåler for lite vann bedre enn for mye.',
   'other', 'any', '{couple,single}', null, null, null, false, 'calendar', 'week', 1, '{7}', null, 100);

do $$
declare n int;
begin
  select count(*) into n from public.task_templates where slug like 'routine-%';
  if n <> 25 then
    raise exception 'routine_templates: % rutinemaler, ventet 25', n;
  end if;
end;
$$;
