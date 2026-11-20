-- Gjennomgang av malene: korte titler, «Slik gjør du», hyppighet og kilder.
-- Grunnlag: docs/maler-gjennomgang.md (kolonnene «Forslag») og kildesjekken mot DSB og Bergen kommune.
-- Se docs/DATABASE.md §4.
--
-- 1. Malene (årshjul, hjemprofil, intervall og sesong) får ny tittel og beskrivelse, og noen får kilde.
--    Rutinemalene røres ikke.
-- 2. Brannslukker, jordfeilbryter og kjøkkenvifte går fra én gang i året til hver 3. måned etter sist
--    utført. Kvartalsvis er et intervall, ikke kalender: bare årlige kalenderoppgaver står i Årshjul
--    (src/features/tasks/section.ts), mens intervaller på minst 3 måneder gjør det. Kalender hver
--    3. måned ville havnet i Hverdag og krevd fast dag.
-- 3. Røykvarslerne deles i to: smoke-alarms blir batteribyttet 1. desember (samme gjentakelse som før),
--    og den nye smoke-alarms-test testes hver 3. måned. Ny mal: electrical-check hvert 5. år.
-- 4. Oppgaver laget fra malene får ny tittel og beskrivelse der de fortsatt er lik malens gamle tekst
--    (hver for seg, som i *_rename_trash_template.sql). Har oppgaven fortsatt malens gamle
--    gjentakelse, får den også den nye. Neste frist blir det som kommer først av fristen den hadde
--    og 3 måneder fra i dag, så ingen oppgave blir forfalt på grunn av migrasjonen.

-- Eget navn og «or replace»: ved db reset kjøres alle migrasjonene i samme økt (se
-- *_home_profile_templates.sql).
create or replace function pg_temp.expect_template_review_rows(p_what text, p_count int, p_expected int)
returns void language plpgsql as $$
begin
  if p_count <> p_expected then
    raise exception 'template_review: «%» traff % rader, ventet %', p_what, p_count, p_expected;
  end if;
end;
$$;

-- Malene slik de var, så oppgavene sammenlignes med det som faktisk stod.
create temp table old_templates as
select * from public.task_templates;

-- ---------------------------------------------------------------------------
-- 1. Ny tekst, kilde og (for kvartalsmalene) gjentakelse
-- ---------------------------------------------------------------------------
create temp table template_review (
  slug        text primary key,
  title       text not null,
  description text not null,
  source_name text,
  source_url  text,
  quarterly   boolean not null
);

insert into template_review (slug, title, description, source_name, source_url, quarterly) values
  ('fridge-deep-clean',
   'Vask kjøleskapet grundig',
   'Ta ut alt og kast det som er gått ut. Vask hyller og skuffer med lunkent vann og litt oppvaskmiddel. Tørk godt før maten settes inn igjen.',
   null, null, false),
  ('kitchen-leak-check',
   'Se etter lekkasje under benken',
   'Se etter fukt, misfarging og svak lukt under vasken og rundt oppvaskmaskinen. Små lekkasjer som oppdages tidlig, sparer store skader.',
   null, null, false),
  ('ventilation-valves',
   'Rens ventilasjonsventilene',
   'Tørk av eller støvsug ventilene. Ikke vri på dem, så innstillingen blir som den er.',
   null, null, false),
  ('earth-fault-breaker',
   'Test jordfeilbryteren',
   'Trykk på testknappen i sikringsskapet. Bryteren skal slå ut, så slår du den på igjen. Slår den ikke ut, kontakt en elektriker. Bergen brannvesen anbefaler å teste hver måned. Her er det satt til hvert kvartal – endre hyppigheten hvis du vil.',
   'Bergen kommune', 'https://www.bergen.kommune.no/innbyggerhjelpen/brannvern-samfunnssikkerhet-og-beredskap/brann-og-redning/brannsikkerhet-hjemme/slik-sjekker-du-brannsikkerheten-hjemme', true),
  ('water-heater-valve',
   'Se etter drypp fra berederen',
   'Se om det drypper fra sikkerhetsventilen eller står vann under berederen. Følg anvisningen for berederen før du vrir på ventilen – rusk kan gjøre at den lekker etterpå. Kontakt rørlegger ved tvil.',
   null, null, false),
  ('windows-outside',
   'Vask vinduer ute',
   'Vask helst når det er overskyet. I sterk sol tørker vannet for fort, og det blir striper.',
   null, null, false),
  ('kids-clothes-summer',
   'Sorter barneklær før sommeren',
   'Legg bort vinterklærne og se hva som er blitt for lite. Da vet dere hva som trengs til sommeren.',
   null, null, false),
  ('roof-check',
   'Sjekk taket etter vinteren',
   'Se etter løse eller knuste takstein og skader etter snø og is. Bruk gjerne kikkert fra bakken. Arbeid på taket overlater du til fagfolk.',
   null, null, false),
  ('foundation-check',
   'Sjekk grunnmuren',
   'Se etter våte flekker, sprekker og smeltevann som renner mot huset. Fukt i grunnmuren kan gi råte og mugg.',
   null, null, false),
  ('outdoor-tap-open',
   'Åpne utekranen',
   'Åpne stoppekranen inne hvis dere har en, og så kranen ute. Se etter lekkasje både ute og inne. En frostsprengt kran kan lekke inn i veggen uten at det synes.',
   null, null, false),
  ('gutters-spring',
   'Rens takrennene',
   'Fjern løv og rusk fra renner og nedløp, så regnvannet renner bort fra huset. Bruk en stødig stige og ha noen i nærheten.',
   null, null, false),
  ('deck-wash-stain',
   'Vask og beis terrassen',
   'Vask terrassen og la den tørke godt i noen dager før du beiser. Følg anvisningen på boksen.',
   null, null, false),
  ('bathroom-silicone',
   'Sjekk fugene på badet',
   'Se etter sprekker, misfarging og fuger som har løsnet. Skadde fuger kan slippe vann inn bak flisene.',
   null, null, false),
  ('exterior-check',
   'Sjekk kledning og maling',
   'Se etter flassende maling og sprekker, de slipper inn fukt. Små skader er raskere å rette enn en hel vegg.',
   null, null, false),
  ('school-start',
   'Gjør klar til skolestart',
   'Sjekk sekk, gymtøy, sko og regntøy. Skriv en liste over det som mangler.',
   null, null, false),
  ('dust-heaters',
   'Støvsug ovner og radiatorer',
   'Støvsug og tørk av før det blir kaldt. Støv på ovnene kan lukte svidd og gi dårligere luft når varmen slås på.',
   null, null, false),
  ('gutters-autumn',
   'Rens takrennene',
   'Når løvet har falt, fjern det fra renner og nedløp. Tette renner kan gi is og vannskader i vinter. Bruk en stødig stige og ha noen i nærheten.',
   null, null, false),
  ('outdoor-tap-close',
   'Steng og tøm utekranen',
   'Har utekranen egen stoppekran inne, steng den og åpne kranen ute så vannet renner ut. Frostsikker utekran: koble fra hageslangen, ellers kan vannet bli stående og fryse.',
   null, null, false),
  ('garden-furniture',
   'Ta inn hagemøblene',
   'Ta inn puter og møbler som ikke tåler vinteren, eller dekk dem godt til. Da holder de lenger.',
   null, null, false),
  ('fire-extinguisher',
   'Sjekk brannslukkeren',
   'Viseren på trykkmåleren skal stå på grønt. Vend pulverapparatet opp ned et par ganger og hør at pulveret sildrer. Sjekk at det henger lett tilgjengelig. DSB anbefaler å sjekke trykkmåleren hver måned. Her er det satt til hvert kvartal – endre hyppigheten hvis du vil.',
   'DSB', 'https://www.dsb.no/contentassets/b8bcd32ea5364cd49578ee2d003bdb01/trygghet_i_hjemmet_bm_uu.pdf', true),
  ('smoke-alarms',
   'Bytt batteri i røykvarslerne',
   '1. desember er røykvarslerdagen. Bytt batteri i alle røykvarslerne, og trykk på testknappen etterpå for å se at de virker.',
   'DSB', 'https://www.dsb.no/contentassets/b8bcd32ea5364cd49578ee2d003bdb01/trygghet_i_hjemmet_bm_uu.pdf', false),
  ('kitchen-hood-filter',
   'Rens filteret i kjøkkenviften',
   'Metallfiltre kan ofte vaskes i oppvaskmaskinen, kullfiltre må byttes. Fett i filteret gir dårligere avtrekk og kan ta fyr. Bergen brannvesen anbefaler å rengjøre kjøkkenviften hvert kvartal.',
   'Bergen kommune', 'https://www.bergen.kommune.no/innbyggerhjelpen/brannvern-samfunnssikkerhet-og-beredskap/brann-og-redning/brannsikkerhet-hjemme/slik-sjekker-du-brannsikkerheten-hjemme', true),
  ('heat-pump-outdoor-unit-jan',
   'Sjekk utedelen på varmepumpen',
   'Fjern snø og is rundt og oppå utedelen, forsiktig og uten skarpe redskaper. Den trenger luft rundt seg for å virke godt.',
   null, null, false),
  ('ventilation-filter-spring',
   'Bytt ventilasjonsfilter',
   'Gjelder balansert ventilasjon. Sjekk anvisningen for riktig filter. Tette filtre gir dårligere luft og høyere strømforbruk.',
   null, null, false),
  ('sewage-emptying',
   'Sjekk tømming av slamavskiller',
   'Finn ut når slamavskilleren skal tømmes neste gang. Det skjer ofte etter en fast ordning i kommunen. Sørg for at tømmebilen kommer til.',
   null, null, false),
  ('summer-tyres',
   'Bytt til sommerdekk',
   'Sjekk mønsteret og lufttrykket når dekkene byttes. Bytt dekk som er slitt eller skadet.',
   null, null, false),
  ('car-wash-spring',
   'Vask bilen etter vinteren',
   'Vask også understellet og hjulbuene. Veisalt som blir sittende, kan gi rust.',
   null, null, false),
  ('firewood-stack',
   'Stable ved til neste vinter',
   'Stable luftig og under tak, så veden får sommeren på å tørke. Våt ved gir mer sot og dårligere varme.',
   null, null, false),
  ('well-inspect',
   'Sjekk brønnlokket',
   'Se at lokket er helt og tett, og at smeltevannet renner bort fra brønnen. Ellers kan forurensning komme ned i vannet.',
   null, null, false),
  ('cabin-open',
   'Åpne hytta etter vinteren',
   'Se etter frost- og snøskader, lekkasjer og spor av mus. Sjekk også tak og takrenner. Hytta står ofte tom, så skader blir oppdaget sent.',
   null, null, false),
  ('garden-mower',
   'Klargjør hagen og klipperen',
   'Rak plenen, rydd bedene og sjekk gressklipperen. En sløv kniv river gresset i stedet for å klippe det.',
   null, null, false),
  ('lawn-fertilize',
   'Gjødsle plenen',
   'Følg anvisningen på gjødsla. En plen som får næring, tåler slitasje og tørke bedre.',
   null, null, false),
  ('ventilation-summer-mode',
   'Sjekk sommerinnstillingen',
   'Mange aggregater har en sommerinnstilling (bypass) som slipper uteluften forbi varmegjenvinneren. Har aggregatet det, se anvisningen.',
   null, null, false),
  ('well-water-test',
   'Ta prøve av brønnvannet',
   'Med egen brønn har dere selv ansvar for vannkvaliteten. Et laboratorium kan analysere prøven og si hva den bør testes for.',
   'Bergen kommune', 'https://www.bergen.kommune.no/innbyggerhjelpen/vann-vei-og-trafikk/vann-og-avlop/vann-og-vannforsyning/privat-vannforsyning', false),
  ('sewage-inspect',
   'Sjekk avløpsanlegget',
   'Se etter lukt, vann som blir stående på bakken, eller alarm. Feil som oppdages tidlig, er billigere å rette. Kontakt fagfolk ved tvil.',
   null, null, false),
  ('chimney-check',
   'Sjekk pipe og ildsted',
   'Se etter sprekker, og at dører og pakninger på ildstedet er hele. Feiing og tilsyn gjøres av feiervesenet i kommunen. Spør dem ved tvil.',
   null, null, false),
  ('ventilation-filter-autumn',
   'Bytt ventilasjonsfilter',
   'Gjelder balansert ventilasjon. Sjekk anvisningen for riktig filter. Tette filtre gir dårligere luft og høyere strømforbruk.',
   null, null, false),
  ('ventilation-unit-clean',
   'Rengjør ventilasjonsaggregatet',
   'Følg anvisningen: den sier hva du kan gjøre selv, og hvor ofte. Støv i vifter og varmegjenvinner gir dårligere luft. Bruk fagfolk ved tvil.',
   null, null, false),
  ('hydronic-pressure',
   'Sjekk trykket i varmeanlegget',
   'Les av manometeret på anlegget. Riktig trykk står i anvisningen. Er trykket for lavt, følg anvisningen eller kontakt en rørlegger.',
   null, null, false),
  ('winter-tyres',
   'Bytt til vinterdekk',
   'Bytt før det blir glatt. Vinterdekk trenger mer mønster enn sommerdekk, så sjekk mønsteret når du bytter.',
   null, null, false),
  ('car-winter-ready',
   'Gjør bilen klar for vinteren',
   'Fyll spylervæske som tåler frost, sjekk viskerbladene, og legg isskrape og kost i bilen.',
   null, null, false),
  ('hydronic-bleed',
   'Luft radiatorene',
   'Slå av sirkulasjonspumpen en halvtime før, så luften samler seg øverst. Åpne luftenippelen med en luftenøkkel, og hold en klut under. Steng når det kommer vann i stedet for luft. Sjekk trykket i anlegget etterpå, det kan synke når du lufter. Luft i radiatorene gir kalde partier og lyder.',
   null, null, false),
  ('leaves-rake',
   'Rak løv fra plenen',
   'Rak løvet av plenen før snøen kommer. Løv som blir liggende gjennom vinteren, kan kvele gresset.',
   null, null, false),
  ('mower-winter',
   'Sett bort gressklipperen',
   'Rengjør klipperen før den settes bort. Bensinklipper: følg anvisningen for vinterlagring. Batteriklipper: lagre batteriet frostfritt.',
   null, null, false),
  ('cabin-close',
   'Gjør hytta klar for vinteren',
   'Rydd bort mat som kan trekke til seg mus. Står hytta uoppvarmet med innlagt vann, steng og tøm vannet så rørene ikke fryser.',
   null, null, false),
  ('heat-pump-outdoor-unit-nov',
   'Sjekk utedelen på varmepumpen',
   'Fjern løv, snø og is rundt og oppå utedelen, forsiktig og uten skarpe redskaper. Den trenger luft rundt seg for å virke godt.',
   null, null, false),
  ('heat-pump-filter',
   'Rens filtrene i varmepumpen',
   'Støv i filtrene gir dårligere varme og høyere strømforbruk. Her er det satt til hver 8. uke. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.',
   null, null, false),
  ('ventilation-filter',
   'Bytt ventilasjonsfilter',
   'Sjekk anvisningen for riktig filter. Her er det satt til hver 6. måned. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.',
   null, null, false),
  ('lawn-mow',
   'Klipp plenen',
   'Klipp ofte, og ikke for kort. Da blir plenen tettere, og det blir mindre mose og ugress.',
   null, null, false),
  ('weed-beds',
   'Luk ugress i bedene',
   'Dra opp ugresset mens det er lite. Venter du, setter det frø og sprer seg.',
   null, null, false);

do $$
declare n int;
begin
  update public.task_templates tt
  set title = r.title,
      description = r.description,
      source_name = r.source_name,
      source_url = r.source_url
  from template_review r
  where tt.slug = r.slug;
  get diagnostics n = row_count;
  perform pg_temp.expect_template_review_rows('nye tekster', n, (select count(*)::int from template_review));

  update public.task_templates tt
  set recurrence_type = 'interval', recurrence_unit = 'month', recurrence_every = 3,
      month = null, month_day = null
  from template_review r
  where tt.slug = r.slug and r.quarterly;
  get diagnostics n = row_count;
  perform pg_temp.expect_template_review_rows('kvartalsmaler', n, 3);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Nye maler
-- ---------------------------------------------------------------------------
insert into public.task_templates
  (slug, title, description, category, recurrence_type, recurrence_unit, recurrence_every,
   source_name, source_url, sort_order)
values
  ('smoke-alarms-test', 'Test røykvarslerne',
   'Trykk på testknappen på alle røykvarslerne, helst med røyk hvis du kan. DSB anbefaler å teste hver måned. Her er det satt til hvert kvartal – endre hyppigheten hvis du vil.',
   'maintenance', 'interval', 'month', 3, 'DSB',
   'https://www.dsb.no/contentassets/b8bcd32ea5364cd49578ee2d003bdb01/trygghet_i_hjemmet_bm_uu.pdf', 10),
  ('electrical-check', 'Bestill el-sjekk',
   'Få en godkjent el-installatør til å sjekke det elektriske anlegget. Feil oppdages før de blir farlige.',
   'maintenance', 'interval', 'year', 5, 'Bergen kommune',
   'https://www.bergen.kommune.no/innbyggerhjelpen/brannvern-samfunnssikkerhet-og-beredskap/brann-og-redning/brannsikkerhet-hjemme/slik-sjekker-du-brannsikkerheten-hjemme', 30);

-- ---------------------------------------------------------------------------
-- 3. Oppgaver som fortsatt har malens gamle tekst
-- ---------------------------------------------------------------------------
update public.tasks t
set title = tt.title
from public.task_templates tt
join old_templates o on o.id = tt.id
where t.template_id = tt.id
  and t.title = o.title
  and tt.title <> o.title;

update public.tasks t
set description = tt.description
from public.task_templates tt
join old_templates o on o.id = tt.id
where t.template_id = tt.id
  and t.description = o.description
  and tt.description <> o.description;

-- ---------------------------------------------------------------------------
-- 4. Oppgaver som fortsatt har malens gamle gjentakelse (bare kvartalsmalene)
--
-- Når gjentakelsen endres, starter triggeren oppgaven på nytt fra i dag (tasks_set_defaults), og
-- en intervalloppgave får da frist i dag. Derfor lagres fristen først: det som kommer først av
-- siste dag den kunne gjøres uten å være forfalt (due_by: siste dag i måneden for månedsoppgaver)
-- og 3 måneder fra i dag. Så settes fristen i en egen update, der gjentakelsen ikke endres og
-- triggeren lar fristen stå. En oppgave som allerede var forfalt, er det fortsatt.
-- ---------------------------------------------------------------------------
create temp table requeued as
select t.id,
       least(private.due_by(t),
             (private.household_today(t.household_id) + interval '3 months')::date) as next_due_on
from public.tasks t
join old_templates o on o.id = t.template_id
join template_review r on r.slug = o.slug and r.quarterly
where t.archived_at is null
  and (t.recurrence_type, t.recurrence_unit, t.recurrence_every, t.weekdays, t.month_day, t.month,
       t.season_start_month, t.season_end_month)
      is not distinct from
      (o.recurrence_type, o.recurrence_unit, o.recurrence_every, o.weekdays, o.month_day, o.month,
       o.season_start_month, o.season_end_month);

update public.tasks t
set recurrence_type = 'interval', recurrence_unit = 'month', recurrence_every = 3,
    month = null, month_day = null
from requeued q
where t.id = q.id;

update public.tasks t
set next_due_on = q.next_due_on
from requeued q
where t.id = q.id;

-- Temp-tabellene ville ellers levd videre i økten (db reset kjører alle migrasjonene i samme økt).
drop table requeued, template_review, old_templates;
