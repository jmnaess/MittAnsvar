-- Tester for gjentakelsen: private.compute_next_due, private.first_due og private.local_today.
-- Se docs/DATABASE.md §2. Funksjonene leser ingen tabeller, så vi bygger oppgaverader i minnet.
begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

create schema tests;

-- Bygger en tasks-rad uten å lagre den. Bare gjentakelsesfeltene er satt.
create function tests.task(
  p_type     public.recurrence_type,
  p_unit     public.recurrence_unit default null,
  p_every    int default null,
  p_weekdays smallint[] default null,
  p_month_day int default null,
  p_month    int default null,
  p_anchor   date default '2026-10-01',
  p_next     date default null
)
returns public.tasks language plpgsql as $$
declare t public.tasks;
begin
  t.recurrence_type  := p_type;
  t.recurrence_unit  := p_unit;
  t.recurrence_every := p_every;
  t.weekdays         := p_weekdays;
  t.month_day        := p_month_day;
  t.month            := p_month;
  t.anchor_on        := p_anchor;
  t.next_due_on      := p_next;
  return t;
end;
$$;

-- ===========================================================================
-- 1. Tabellen i DATABASE.md §2 (tilfelle 1–12)
-- ===========================================================================
select is(private.compute_next_due(tests.task('once', p_next => '2026-10-04'), '2026-10-04'),
  null, '1: engangsoppgave er ferdig');

select is(private.compute_next_due(
    tests.task('calendar', 'week', 1, '{7}', p_next => '2026-10-04'), '2026-10-04'),
  '2026-10-11'::date, '2: hver søndag, gjort på fristen');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 1, '{7}', p_next => '2026-10-04'), '2026-10-03'),
  '2026-10-11'::date, '3: hver søndag, gjort tidlig (lørdag)');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 1, '{7}', p_next => '2026-10-04'), '2026-10-05'),
  '2026-10-11'::date, '4: hver søndag, gjort sent (mandag)');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 1, '{1,4}', p_next => '2026-10-05'), '2026-10-05'),
  '2026-10-08'::date, '5: mandag og torsdag');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 2, '{6}', p_anchor => '2026-10-03', p_next => '2026-10-03'), '2026-10-03'),
  '2026-10-17'::date, '6: annenhver lørdag');

select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 20, p_next => '2026-10-20'), '2026-10-20'),
  '2026-11-20'::date, '7: den 20. hver måned');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 31, p_next => '2026-10-31'), '2026-10-31'),
  '2026-11-30'::date, '8: den 31. blir siste dag i november');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 31, p_anchor => '2028-01-01', p_next => '2028-01-31'), '2028-01-31'),
  '2028-02-29'::date, '9: den 31. blir 29. februar i skuddår');

select is(private.compute_next_due(
    tests.task('calendar', 'year', 1, p_month => 10, p_next => '2026-10-01'), '2026-10-15'),
  '2027-10-01'::date, '10: i oktober hvert år');

select is(private.compute_next_due(
    tests.task('interval', 'month', 3, p_next => '2026-10-01'), '2026-10-10'),
  '2027-01-10'::date, '11: 3 måneder etter sist utført (ikke etter fristen)');
select is(private.compute_next_due(
    tests.task('interval', 'month', 1, p_next => '2027-01-31'), '2027-01-31'),
  '2027-02-28'::date, '12: 1 måned etter 31. januar er 28. februar');

-- ===========================================================================
-- 2. Skifte av måned og år
-- ===========================================================================
select is(private.compute_next_due(
    tests.task('calendar', 'week', 1, '{7}', p_next => '2026-12-27'), '2026-12-27'),
  '2027-01-03'::date, 'hver søndag over årsskiftet');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 15, p_next => '2026-12-15'), '2026-12-15'),
  '2027-01-15'::date, 'den 15. hver måned over årsskiftet');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 31, p_next => '2026-12-31'), '2026-12-31'),
  '2027-01-31'::date, 'den 31. fra desember til januar');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 1, p_next => '2026-11-01'), '2026-11-17'),
  '2026-12-01'::date, 'den 1. hver måned, gjort sent');
select is(private.compute_next_due(
    tests.task('interval', 'day', 14, p_next => '2026-12-20'), '2026-12-20'),
  '2027-01-03'::date, '14 dager etter sist, over årsskiftet');
select is(private.compute_next_due(
    tests.task('interval', 'week', 2, p_next => '2026-11-17'), '2026-11-20'),
  '2026-12-04'::date, '2 uker etter sist utført');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 2, '{6}', p_anchor => '2026-12-19', p_next => '2026-12-19'), '2026-12-19'),
  '2027-01-02'::date, 'annenhver lørdag over årsskiftet');
-- 2026 har 53 ISO-uker. Med mandager i stedet for ukenummer spiller det ingen rolle.
select is(private.compute_next_due(
    tests.task('calendar', 'week', 2, '{1}', p_anchor => '2026-12-28', p_next => '2026-12-28'), '2026-12-28'),
  '2027-01-11'::date, 'annenhver mandag fra uke 53');
select is(private.compute_next_due(
    tests.task('calendar', 'day', 3, p_anchor => '2026-12-30', p_next => '2026-12-30'), '2026-12-30'),
  '2027-01-02'::date, 'hver 3. dag over årsskiftet');

-- ===========================================================================
-- 3. Lange intervaller (sperren i next_occurrence må tåle dem)
-- ===========================================================================
select is(private.compute_next_due(
    tests.task('calendar', 'year', 5, p_month => 3, p_month_day => 1,
               p_anchor => '2026-03-01', p_next => '2026-03-01'), '2026-03-01'),
  '2031-03-01'::date, 'hvert 5. år');
select is(private.compute_next_due(
    tests.task('calendar', 'year', 5, p_month => 2, p_month_day => 29,
               p_anchor => '2028-02-29', p_next => '2028-02-29'), '2028-02-29'),
  '2033-02-28'::date, 'hvert 5. år 29. februar blir 28. februar når det ikke er skuddår');
select is(private.compute_next_due(
    tests.task('calendar', 'year', 100, p_month => 3, p_month_day => 1,
               p_anchor => '2026-03-01', p_next => '2026-03-01'), '2026-03-01'),
  '2126-03-01'::date, 'hvert 100. år (største tillatte)');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 12, p_month_day => 31,
               p_anchor => '2026-01-31', p_next => '2026-01-31'), '2026-01-31'),
  '2027-01-31'::date, 'hver 12. måned den 31.');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 100, p_month_day => 31,
               p_anchor => '2026-01-31', p_next => '2026-01-31'), '2026-01-31'),
  '2034-05-31'::date, 'hver 100. måned den 31.');
select is(private.compute_next_due(
    tests.task('calendar', 'week', 100, '{1}', p_anchor => '2026-11-16', p_next => '2026-11-16'), '2026-11-16'),
  '2026-11-16'::date + 700, 'hver 100. uke');
select is(private.compute_next_due(
    tests.task('interval', 'year', 100, p_next => '2026-11-17'), '2026-11-17'),
  '2126-11-17'::date, '100 år etter sist utført');

-- ===========================================================================
-- 4. Første frist for en ny oppgave (anchor_on = i dag, tirsdag 17. november 2026)
-- ===========================================================================
select is(private.first_due(tests.task('once', p_anchor => '2026-11-17')),
  '2026-11-17'::date, 'første frist: engangsoppgave = i dag');
select is(private.first_due(tests.task('interval', 'day', 14, p_anchor => '2026-11-17')),
  '2026-11-17'::date, 'første frist: intervall = i dag');
select is(private.first_due(tests.task('calendar', 'week', 1, '{2}', p_anchor => '2026-11-17')),
  '2026-11-17'::date, 'første frist: hver tirsdag, laget på en tirsdag = i dag');
select is(private.first_due(tests.task('calendar', 'week', 1, '{1}', p_anchor => '2026-11-17')),
  '2026-11-23'::date, 'første frist: hver mandag, laget på en tirsdag = neste mandag');
select is(private.first_due(tests.task('calendar', 'month', 1, p_month_day => 1, p_anchor => '2026-11-17')),
  '2026-12-01'::date, 'første frist: den 1. hver måned');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 10, p_anchor => '2026-11-17')),
  '2027-10-01'::date, 'første frist: i oktober, laget i november = neste år');

-- ===========================================================================
-- 5. «I dag» i husstandens tidssone rundt midnatt (Europe/Oslo)
-- ===========================================================================
select is(private.local_today('Europe/Oslo', '2026-01-15 22:59:59+00'), '2026-01-15'::date,
  'vinter: 23:59 i Oslo er fortsatt samme dag');
select is(private.local_today('Europe/Oslo', '2026-01-15 23:00:00+00'), '2026-01-16'::date,
  'vinter: 00:00 i Oslo er neste dag (UTC er fortsatt forrige dag)');
select is(private.local_today('Europe/Oslo', '2026-07-15 21:59:59+00'), '2026-07-15'::date,
  'sommer: 23:59 i Oslo er fortsatt samme dag');
select is(private.local_today('Europe/Oslo', '2026-07-15 22:00:00+00'), '2026-07-16'::date,
  'sommer: 00:00 i Oslo er neste dag');
select is(private.local_today('Europe/Oslo', '2026-12-31 23:00:00+00'), '2027-01-01'::date,
  'nyttårsnatt: 00:00 i Oslo er nytt år');
select is(private.local_today('Europe/Oslo', '2026-03-28 23:00:00+00'), '2026-03-29'::date,
  'natten vi stiller klokken frem: midnatt i Oslo er neste dag');

-- ===========================================================================
-- 6. Check-constraints avviser ugyldig gjentakelse
-- ===========================================================================
insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test', 'single', 'apartment', now() + interval '14 days');

select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, month, month_day)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'For lang', 'calendar', 'year', 101, 3, 1)$$,
  '23514', null, 'hvert 101. år avvises');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Uke uten dager', 'calendar', 'week', 1)$$,
  '23514', null, 'ukentlig uten ukedager avvises');

-- ===========================================================================
-- 7. Månedsoppgaver (calendar, year, month_day null). Se DATABASE.md §2.
--    Frist = måneden. next_due_on er den 1., forfalt først etter siste dag i måneden.
-- ===========================================================================

-- Månedsskifte
select is(private.due_by(tests.task('calendar', 'year', 1, p_month => 11, p_next => '2026-11-01')),
  '2026-11-30'::date, 'månedsoppgave: siste frist er siste dag i måneden');
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 11, p_next => '2026-11-01'), '2026-11-30'),
  false, 'månedsskifte: november-oppgave er ikke forfalt 30. november');
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 11, p_next => '2026-11-01'), '2026-12-01'),
  true, 'månedsskifte: november-oppgave er forfalt 1. desember');
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 2, p_next => '2028-02-01'), '2028-02-29'),
  false, 'skuddår: februar-oppgave er ikke forfalt 29. februar');

-- Årsskifte
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 12, p_next => '2026-12-01'), '2026-12-31'),
  false, 'årsskifte: desember-oppgave er ikke forfalt 31. desember');
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 12, p_next => '2026-12-01'), '2027-01-01'),
  true, 'årsskifte: desember-oppgave er forfalt 1. januar');
select is(private.compute_next_due(
    tests.task('calendar', 'year', 1, p_month => 12, p_next => '2026-12-01'), '2027-01-02'),
  '2027-12-01'::date, 'årsskifte: desember-oppgave utført 2. januar får frist desember samme år, ikke året etter');

-- Utført i måneden og etter måneden
select is(private.compute_next_due(
    tests.task('calendar', 'year', 1, p_month => 11, p_next => '2026-11-01'), '2026-11-17'),
  '2027-11-01'::date, 'månedsoppgave utført i måneden: samme måned neste år');
select is(private.compute_next_due(
    tests.task('calendar', 'year', 1, p_month => 11, p_next => '2026-11-01'), '2026-12-03'),
  '2027-11-01'::date, 'månedsoppgave utført for sent: fortsatt samme måned neste år');

-- Første frist ved aktivering
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 11, p_anchor => '2026-11-17')),
  '2026-11-01'::date, 'første frist: aktivert i måneden = denne måneden');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 11, p_anchor => '2026-11-30')),
  '2026-11-01'::date, 'første frist: aktivert siste dag i måneden = denne måneden');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 12, p_anchor => '2026-11-17')),
  '2026-12-01'::date, 'første frist: aktivert måneden før = neste måned');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 12, p_anchor => '2026-12-31')),
  '2026-12-01'::date, 'første frist: desember aktivert nyttårsaften = denne måneden');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 1, p_anchor => '2026-12-31')),
  '2027-01-01'::date, 'første frist: januar aktivert nyttårsaften = januar neste år');

-- Fast dato fungerer som før
select is(private.due_by(tests.task('calendar', 'year', 1, p_month => 12, p_month_day => 1, p_next => '2026-12-01')),
  '2026-12-01'::date, 'fast dato: siste frist er datoen');
select is(private.is_overdue(tests.task('calendar', 'year', 1, p_month => 12, p_month_day => 1, p_next => '2026-12-01'), '2026-12-02'),
  true, 'fast dato: 1. desember er forfalt 2. desember');
select is(private.first_due(tests.task('calendar', 'year', 1, p_month => 11, p_month_day => 1, p_anchor => '2026-11-17')),
  '2027-11-01'::date, 'fast dato: 1. november laget 17. november = neste år');
select is(private.is_month_task(tests.task('calendar', 'month', 1, p_month_day => 1)), false,
  'den 1. hver måned er ikke en månedsoppgave');
select is(private.due_by(tests.task('once', p_next => null)), null::date,
  'utført engangsoppgave har ingen siste frist');

select * from finish();
rollback;
