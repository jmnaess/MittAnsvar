-- Innhold for hjemprofilen: betingelser på eksisterende maler og nye maler.
-- Kilde: docs/hjemprofil-oppgaver-UTKAST.md (utkast 2, gjennomgått av utvikleren 2026-11-18).
-- Tekstene er generelle og henviser til anvisning eller fagfolk. Ingen kilder er sjekket.
--
-- Malene finnes på slug. Hver endring må treffe nøyaktig én rad, ellers stopper migrasjonen
-- (samme mønster som *_adjust_task_templates.sql).
--
-- Endringene gjelder bare malene. Oppgaver som allerede er aktivert, er kopier og røres ikke.
-- Årshjulet viser fortsatt maler husstanden har aktive, selv om de ikke lenger passer profilen
-- (templates/suggest.ts, yearWheelTemplates).

-- Eget navn og «or replace»: ved db reset/push kjøres alle migrasjonene i samme økt, og
-- pg_temp.expect_one_template fra *_adjust_task_templates.sql finnes da fortsatt.
create or replace function pg_temp.expect_template_rows(p_what text, p_count int, p_expected int default 1)
returns void language plpgsql as $$
begin
  if p_count <> p_expected then
    raise exception 'home_profile_templates: «%» traff % rader, ventet %', p_what, p_count, p_expected;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Eksisterende maler får betingelse
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  update public.task_templates set requires = '{"has_car": true}' where slug = 'summer-tyres';
  get diagnostics n = row_count;
  perform pg_temp.expect_template_rows('summer-tyres', n);

  update public.task_templates set requires = '{"has_car": true}' where slug = 'winter-tyres';
  get diagnostics n = row_count;
  perform pg_temp.expect_template_rows('winter-tyres', n);

  -- Peis kan finnes i leilighet, og et hus kan mangle ildsted: betingelsen erstatter «hus».
  update public.task_templates set requires = '{"has_fireplace": true}', housing_types = null
  where slug = 'chimney-check';
  get diagnostics n = row_count;
  perform pg_temp.expect_template_rows('chimney-check', n);

  update public.task_templates set requires = '{"has_garden": true}' where slug = 'garden-mower';
  get diagnostics n = row_count;
  perform pg_temp.expect_template_rows('garden-mower', n);

  -- Vår- og høstfilteret erstattes av intervallmalen ventilation-filter (under).
  update public.task_templates set is_active = false, requires = '{"has_balanced_ventilation": true}'
  where slug in ('ventilation-filter-spring', 'ventilation-filter-autumn');
  get diagnostics n = row_count;
  perform pg_temp.expect_template_rows('ventilation-filter-spring/autumn', n, 2);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Nye årsmaler (månedsoppgaver: calendar, year, every 1, month_day null)
-- ---------------------------------------------------------------------------
insert into public.task_templates
  (slug, title, description, category, housing_types, requires,
   recurrence_type, recurrence_unit, recurrence_every, month, sort_order)
values
  -- Alle boliger
  ('water-heater-valve', 'Sjekk sikkerhetsventilen på varmtvannsberederen',
   'Gjelder hvis dere har egen varmtvannsbereder. Vri eller løft på sikkerhetsventilen til det renner vann ut i sluket. Følg anvisningen for berederen. Lekker ventilen, eller slipper den ikke ut vann, kontakt en rørlegger.',
   'safety', null, null, 'calendar', 'year', 1, 3, 25),

  -- Varmepumpe
  ('heat-pump-outdoor-unit-nov', 'Sjekk at utedelen på varmepumpen er fri for løv, snø og is',
   'Utedelen trenger luft rundt seg for å virke godt. Fjern løv, snø og is rundt og oppå den, forsiktig og uten skarpe redskaper.',
   'maintenance', null, '{"has_air_heat_pump": true}', 'calendar', 'year', 1, 11, 20),
  ('heat-pump-outdoor-unit-jan', 'Sjekk at utedelen på varmepumpen er fri for løv, snø og is',
   'Midt på vinteren kan snø og is ha bygd seg opp. Utedelen trenger luft rundt seg for å virke godt. Fjern snø og is forsiktig og uten skarpe redskaper.',
   'maintenance', null, '{"has_air_heat_pump": true}', 'calendar', 'year', 1, 1, 20),

  -- Peis/vedovn
  ('firewood-stack', 'Skaff og stable ved til neste vinter',
   'Ved som stables om våren, får sommeren på å tørke. Stable luftig og under tak. Våt ved gir mer sot og dårligere varme.',
   'outdoor', null, '{"has_fireplace": true}', 'calendar', 'year', 1, 4, 50),

  -- Balansert ventilasjon
  ('ventilation-unit-clean', 'Rengjør ventilasjonsaggregatet etter anvisningen',
   'Støv i vifter og varmegjenvinner gir dårligere luft. Hva du kan gjøre selv, og hvor ofte, avhenger av aggregatet. Følg anvisningen, og bruk fagfolk ved tvil.',
   'maintenance', null, '{"has_balanced_ventilation": true}', 'calendar', 'year', 1, 9, 30),
  ('ventilation-summer-mode', 'Sjekk sommer- og vinterinnstilling på aggregatet',
   'Mange aggregater har en sommerinnstilling (bypass) som slipper uteluften forbi varmegjenvinneren. Gjelder bare hvis aggregatet har det. Se anvisningen.',
   'maintenance', null, '{"has_balanced_ventilation": true}', 'calendar', 'year', 1, 5, 40),

  -- Vannbåren varme
  ('hydronic-pressure', 'Sjekk trykket i varmeanlegget før fyringssesongen',
   'For lavt trykk gir dårlig varme. Les av manometeret på anlegget. Riktig trykk står i anvisningen. Er trykket for lavt, følg anvisningen eller kontakt en rørlegger.',
   'maintenance', null, '{"has_hydronic_heating": true}', 'calendar', 'year', 1, 9, 40),
  ('hydronic-bleed', 'Luft radiatorene',
   'Gjelder radiatorer. Har dere bare gulvvarme, kan oppgaven hoppes over. Luft i radiatorene gir kalde partier og lyder.',
   'maintenance', null, '{"has_hydronic_heating": true}', 'calendar', 'year', 1, 10, 50),

  -- Egen brønn
  ('well-inspect', 'Sjekk brønnlokket og at overflatevann ikke renner inn',
   'Smeltevann om våren kan føre forurensning ned i brønnen. Se at lokket er helt og tett, og at vannet renner bort fra brønnen.',
   'maintenance', null, '{"has_private_well": true}', 'calendar', 'year', 1, 4, 60),
  ('well-water-test', 'Ta vannprøve av brønnvannet',
   'Med egen brønn har dere selv ansvar for vannkvaliteten. Et laboratorium kan analysere prøven og fortelle hva den bør testes for.',
   'safety', null, '{"has_private_well": true}', 'calendar', 'year', 1, 5, 50),

  -- Avløp (septiktank eller minirenseanlegg)
  ('sewage-emptying', 'Sjekk når slamavskilleren skal tømmes',
   'Tømming skjer ofte etter en fast ordning i kommunen. Finn ut når det er neste gang, og sørg for at tømmebilen kommer til.',
   'maintenance', null, '{"sewage_type": ["septic_tank", "mini_treatment_plant"]}', 'calendar', 'year', 1, 3, 40),
  ('sewage-inspect', 'Se etter lukt, vann på bakken eller alarm rundt avløpsanlegget',
   'Lukt, vann som blir stående på bakken eller en alarm kan bety feil på anlegget. Feil som oppdages tidlig, er billigere å rette. Kontakt fagfolk ved tvil.',
   'maintenance', null, '{"sewage_type": ["septic_tank", "mini_treatment_plant"]}', 'calendar', 'year', 1, 5, 60),

  -- Hage/plen
  ('lawn-fertilize', 'Gjødsle plenen',
   'En plen som får næring, tåler slitasje og tørke bedre. Følg anvisningen på gjødsla.',
   'outdoor', null, '{"has_garden": true}', 'calendar', 'year', 1, 5, 35),
  ('leaves-rake', 'Rake løv fra plenen',
   'Løv som blir liggende gjennom vinteren, kan kvele gresset.',
   'outdoor', null, '{"has_garden": true}', 'calendar', 'year', 1, 10, 60),
  ('mower-winter', 'Sett gressklipperen bort for vinteren',
   'Rengjør klipperen før den settes bort. Bensinklipper: følg anvisningen for vinterlagring. Batteriklipper: lagre batteriet frostfritt.',
   'outdoor', null, '{"has_garden": true}', 'calendar', 'year', 1, 10, 70),

  -- Bil
  ('car-wash-spring', 'Vask bilen grundig etter vinteren, også under',
   'Veisalt som blir sittende, kan gi rust. Vask også understellet og hjulbuene.',
   'maintenance', null, '{"has_car": true}', 'calendar', 'year', 1, 4, 15),
  ('car-winter-ready', 'Gjør bilen klar for vinteren',
   'Fyll spylervæske som tåler frost, sjekk viskerbladene, og legg isskrape og kost i bilen.',
   'maintenance', null, '{"has_car": true}', 'calendar', 'year', 1, 10, 15),

  -- Enebolig og rekkehus
  ('foundation-check', 'Se etter fukt og sprekker i grunnmuren',
   'Fukt i grunnmuren kan gi råte og mugg. Om våren ser du hvor smeltevannet går. Se etter våte flekker, sprekker og vann som renner mot huset.',
   'maintenance', '{townhouse,house}', null, 'calendar', 'year', 1, 4, 70),
  ('exterior-check', 'Sjekk kledning og maling ute',
   'Flassende maling og sprekker slipper inn fukt. Små skader er raskere å rette enn en hel vegg.',
   'maintenance', '{townhouse,house}', null, 'calendar', 'year', 1, 6, 30),

  -- Hytte
  ('cabin-open', 'Åpne hytta etter vinteren og se etter skader',
   'Se etter frost- og snøskader, lekkasjer og spor av mus. Sjekk også tak og takrenner. Hytta står ofte tom, så skader blir oppdaget sent.',
   'maintenance', null, '{"has_cabin": true}', 'calendar', 'year', 1, 4, 80),
  ('cabin-close', 'Gjør hytta klar for vinteren',
   'Rydd bort mat som kan trekke til seg mus. Har hytta innlagt vann og står uoppvarmet, steng og tøm vannet så rørene ikke fryser.',
   'maintenance', null, '{"has_cabin": true}', 'calendar', 'year', 1, 10, 80);

-- ---------------------------------------------------------------------------
-- 3. Nye intervallmaler (interval: N enheter etter sist utført, ingen måned)
--    Første frist er ett intervall frem (se *_interval_templates.sql). Vises ikke i årshjulet.
--    Senere: begrens til fyringssesongen når sesongoppgaver finnes.
-- ---------------------------------------------------------------------------
insert into public.task_templates
  (slug, title, description, category, housing_types, requires,
   recurrence_type, recurrence_unit, recurrence_every, sort_order)
values
  ('heat-pump-filter', 'Rens filtrene i varmepumpen',
   'Støv i filtrene gir dårligere varme og høyere strømforbruk. Her er det satt til hver 8. uke. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.',
   'maintenance', null, '{"has_air_heat_pump": true}', 'interval', 'week', 8, 10),
  ('ventilation-filter', 'Bytt filter i ventilasjonsanlegget',
   'Tette filtre gir dårligere luft og høyere strømforbruk. Her er det satt til hver 6. måned. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.',
   'maintenance', null, '{"has_balanced_ventilation": true}', 'interval', 'month', 6, 20);
