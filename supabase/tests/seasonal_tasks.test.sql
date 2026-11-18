-- Tester for sesongoppgaver (aktiv periode). Se docs/DATABASE.md §2 (Sesong) og
-- *_seasonal_tasks.sql. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(59);

create schema tests;
grant usage on schema tests to anon, authenticated;

-- Bygger en tasks-rad uten å lagre den (som i compute_next_due.test.sql), med periode.
create function tests.task(
  p_type     public.recurrence_type,
  p_unit     public.recurrence_unit default null,
  p_every    int default null,
  p_weekdays smallint[] default null,
  p_month_day int default null,
  p_start    int default null,
  p_end      int default null,
  p_anchor   date default '2026-10-01',
  p_next     date default null
)
returns public.tasks language plpgsql as $$
declare t public.tasks;
begin
  t.recurrence_type    := p_type;
  t.recurrence_unit    := p_unit;
  t.recurrence_every   := p_every;
  t.weekdays           := p_weekdays;
  t.month_day          := p_month_day;
  t.anchor_on          := p_anchor;
  t.next_due_on        := p_next;
  t.season_start_month := p_start;
  t.season_end_month   := p_end;
  return t;
end;
$$;

-- Plenen: hver lørdag, mai–sep. Varmepumpa: 8 uker etter sist, okt–apr.
create function tests.lawn(p_next date default null) returns public.tasks language sql as $$
  select tests.task('calendar', 'week', 1, '{6}', p_start => 5, p_end => 9, p_next => p_next);
$$;
create function tests.heat_pump(p_next date default null) returns public.tasks language sql as $$
  select tests.task('interval', 'week', 8, p_start => 10, p_end => 4, p_next => p_next);
$$;

create function tests.login_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ===========================================================================
-- 1. in_season: innenfor ett år, over nyttår og én måned
-- ===========================================================================
select ok(private.in_season(tests.lawn(), '2027-05-01'), 'mai–sep: 1. mai er med');
select ok(private.in_season(tests.lawn(), '2027-09-30'), 'mai–sep: 30. sep er med');
select ok(not private.in_season(tests.lawn(), '2027-10-01'), 'mai–sep: 1. okt er ikke med');
select ok(not private.in_season(tests.lawn(), '2027-04-30'), 'mai–sep: 30. apr er ikke med');

select ok(private.in_season(tests.heat_pump(), '2027-01-15'), 'okt–apr: januar er med (over nyttår)');
select ok(private.in_season(tests.heat_pump(), '2027-04-30'), 'okt–apr: 30. apr er med');
select ok(not private.in_season(tests.heat_pump(), '2027-05-01'), 'okt–apr: 1. mai er ikke med');
select ok(not private.in_season(tests.heat_pump(), '2027-09-30'), 'okt–apr: 30. sep er ikke med');
select ok(private.in_season(tests.heat_pump(), '2027-10-01'), 'okt–apr: 1. okt er med');

select ok(private.in_season(tests.task('interval', 'week', 1, p_start => 6, p_end => 6), '2027-06-15'),
  'jun–jun: juni er med');
select ok(not private.in_season(tests.task('interval', 'week', 1, p_start => 6, p_end => 6), '2027-07-01'),
  'jun–jun: juli er ikke med');
select ok(private.in_season(tests.task('interval', 'week', 1), '2027-01-01'), 'uten periode: alltid med');

-- ===========================================================================
-- 2. Kalender: innenfor perioden, og hopp til neste periode
-- ===========================================================================
select is(private.compute_next_due(tests.lawn('2027-06-05'), '2027-06-05'), '2027-06-12'::date,
  'hver lørdag mai–sep: neste lørdag i perioden');
select is(private.compute_next_due(tests.lawn('2027-09-25'), '2027-09-25'), '2028-05-06'::date,
  'siste lørdag i september → første lørdag i mai neste år');
select is(private.compute_next_due(tests.lawn('2027-09-25'), '2027-09-28'), '2028-05-06'::date,
  'gjort sent (tirsdag) etter siste lørdag → mai neste år');
select is(private.first_due(tests.task('calendar', 'week', 1, '{6}', p_start => 5, p_end => 9,
                                       p_anchor => '2026-11-18')),
  '2027-05-01'::date, 'første frist aktivert i november: første lørdag i mai');
select is(private.first_due(tests.task('calendar', 'week', 1, '{6}', p_start => 5, p_end => 9,
                                       p_anchor => '2027-06-01')),
  '2027-06-05'::date, 'første frist aktivert i perioden: førstkommende lørdag');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 15, p_start => 10, p_end => 4, p_next => '2027-04-15'),
    '2027-04-15'),
  '2027-10-15'::date, 'den 15. hver måned okt–apr: april → oktober');
select is(private.compute_next_due(
    tests.task('calendar', 'month', 1, p_month_day => 15, p_start => 10, p_end => 4, p_next => '2027-12-15'),
    '2027-12-15'),
  '2028-01-15'::date, 'den 15. hver måned okt–apr: desember → januar (over nyttår)');
select is(private.compute_next_due(
    tests.task('calendar', 'day', 1, p_start => 5, p_end => 9, p_next => '2027-09-30'), '2027-09-30'),
  '2028-05-01'::date, 'hver dag mai–sep: 30. sep → 1. mai');

-- ===========================================================================
-- 3. Intervall over periodeslutt
-- ===========================================================================
select is(private.compute_next_due(tests.heat_pump(), '2027-02-01'), '2027-03-29'::date,
  'okt–apr hver 8. uke: innenfor perioden som vanlig');
select is(private.compute_next_due(tests.heat_pump(), '2026-11-18'), '2027-01-13'::date,
  'okt–apr hver 8. uke: over nyttår som vanlig');
select is(private.compute_next_due(tests.heat_pump(), '2027-03-20'), '2027-10-01'::date,
  'okt–apr: 20. mars + 8 uker = 15. mai → 1. oktober');
select is(private.compute_next_due(
    tests.task('interval', 'week', 1, p_start => 5, p_end => 9), '2027-09-28'),
  '2028-05-01'::date, 'mai–sep hver uke: 28. sep + 1 uke → 1. mai neste år');
select is(private.first_due(tests.task('interval', 'week', 8, p_start => 10, p_end => 4,
                                       p_anchor => '2027-06-10')),
  '2027-10-01'::date, 'første frist (egen intervalloppgave) utenfor perioden: periodens start');
select is(private.first_due(tests.task('interval', 'week', 8, p_start => 10, p_end => 4,
                                       p_anchor => '2027-11-10')),
  '2027-11-10'::date, 'første frist i perioden: i dag');

-- ===========================================================================
-- 4. Hjelpere for periodeslutt
-- ===========================================================================
select is(private.season_gap_after(tests.lawn(), '2027-09-20'), '2027-10-01'::date,
  'gap etter 20. sep (mai–sep): 1. okt');
select is(private.season_gap_after(tests.lawn(), '2027-10-02'), '2027-10-03'::date,
  'gap etter en utsatt dato utenfor perioden: dagen etter');
select is(private.season_gap_after(tests.heat_pump(), '2027-11-10'), '2028-05-01'::date,
  'gap etter november (okt–apr): 1. mai neste år');
select is(private.season_gap_after(tests.heat_pump(), '2028-02-01'), '2028-05-01'::date,
  'gap etter februar (okt–apr): 1. mai samme år');
select is(private.season_gap_after(tests.task('interval', 'week', 1, p_start => 5, p_end => 12), '2027-06-01'),
  '2028-01-01'::date, 'gap etter juni (mai–des): 1. januar');
select is(private.season_gap_after(tests.task('interval', 'week', 1), '2027-06-01'), null::date,
  'uten periode: ingen gap');
select is(private.season_resume(tests.lawn(), '2027-10-01'), '2028-05-06'::date,
  'gjenoppta kalender: første lørdag i neste periode');
select is(private.season_resume(tests.heat_pump(), '2027-05-01'), '2027-10-01'::date,
  'gjenoppta intervall: periodens første dag');

-- ===========================================================================
-- 5. Lagrede oppgaver: check-constraint, trigger, aktivering
-- ===========================================================================
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'couple', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',
   '00000000-0000-0000-0000-00000000a001');

create function tests.insert_task(
  p_id uuid, p_type public.recurrence_type, p_unit public.recurrence_unit, p_every int,
  p_weekdays smallint[], p_month int, p_start int, p_end int
) returns void language sql as $$
  insert into public.tasks (id, household_id, title, recurrence_type, recurrence_unit, recurrence_every,
                            weekdays, month, season_start_month, season_end_month)
  values (p_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test', p_type, p_unit, p_every,
          p_weekdays, p_month, p_start, p_end);
$$;

select throws_ok($$select tests.insert_task(gen_random_uuid(), 'once', null, null, null, null, 5, 9)$$,
  '23514', null, 'engangsoppgave kan ikke ha periode');
select throws_ok($$select tests.insert_task(gen_random_uuid(), 'job', null, null, null, null, 5, 9)$$,
  '23514', null, 'jobb kan ikke ha periode');
select throws_ok($$select tests.insert_task(gen_random_uuid(), 'calendar', 'year', 1, null, 10, 5, 9)$$,
  '23514', null, 'årlig oppgave kan ikke ha periode');
select throws_ok($$select tests.insert_task(gen_random_uuid(), 'interval', 'week', 1, null, null, 5, null)$$,
  '23514', null, 'bare start uten slutt avvises');

-- Oppgaver for resten av testene. Fristene settes for hånd etterpå (triggeren regner bare på nytt
-- når gjentakelsen endres).
select tests.insert_task('11111111-0000-0000-0000-000000000001', 'calendar', 'week', 1, '{6}', null, 5, 9);  -- plen
select tests.insert_task('11111111-0000-0000-0000-000000000002', 'interval', 'week', 8, null, null, 10, 4); -- varmepumpe
select tests.insert_task('11111111-0000-0000-0000-000000000003', 'calendar', 'week', 1, '{6}', null, null, null); -- uten periode
select tests.insert_task('11111111-0000-0000-0000-000000000004', 'calendar', 'week', 1, '{6}', null, 5, 9);  -- arkivert
select tests.insert_task('11111111-0000-0000-0000-000000000005', 'calendar', 'week', 1, '{6}', null, 5, 9);  -- utsatt

-- Trigger: periode som ikke inneholder i dag, gir første frist i neste periode.
update public.tasks
set season_start_month = extract(month from private.household_today(household_id))::int % 12 + 1,
    season_end_month   = extract(month from private.household_today(household_id))::int % 12 + 1
where id = '11111111-0000-0000-0000-000000000003';
select ok(
  (select private.in_season(t, t.next_due_on) and t.next_due_on > private.household_today(t.household_id)
   from public.tasks t where id = '11111111-0000-0000-0000-000000000003'),
  'trigger: ny periode gir ny frist innenfor perioden');
update public.tasks set season_start_month = null, season_end_month = null
where id = '11111111-0000-0000-0000-000000000003';

update public.tasks set next_due_on = '2027-09-25' where id = '11111111-0000-0000-0000-000000000001';
update public.tasks set next_due_on = '2027-04-10' where id = '11111111-0000-0000-0000-000000000002';
update public.tasks set next_due_on = '2027-09-25' where id = '11111111-0000-0000-0000-000000000003';
update public.tasks set next_due_on = '2027-09-25', archived_at = now()
where id = '11111111-0000-0000-0000-000000000004';
update public.tasks set next_due_on = '2027-10-03', postponed_from = '2027-09-25', postponed_to = '2027-10-03'
where id = '11111111-0000-0000-0000-000000000005';

-- ===========================================================================
-- 6. Forfalt ved periodeslutt (roll_over_seasons) og utsettelse utenfor perioden
-- ===========================================================================
-- Varmepumpa (forfalt 10. april) rulles 1. mai. Plenen rulles ikke da.
select is(private.roll_over_seasons('2027-05-01 00:30+02'), 1, '1. mai: én oppgave rulles');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000002'),
  '2027-10-01'::date, 'varmepumpa forfalt ved periodeslutt → 1. oktober');

select is(private.roll_over_seasons('2027-09-30 12:00+02'), 0, '30. sep: ingenting rulles');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  '2027-09-25'::date, '30. sep: plenen er fortsatt forfalt');

select is(private.roll_over_seasons('2027-10-01 00:30+02'), 1, '1. okt: bare plenen rulles');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  '2028-05-06'::date, 'plenen forfalt ved periodeslutt → første lørdag i mai');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000003'),
  '2027-09-25'::date, 'oppgave uten periode røres ikke');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000004'),
  '2027-09-25'::date, 'arkivert oppgave røres ikke');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000005'),
  '2027-10-03'::date, 'utsatt til 3. okt (utenfor perioden): datoen respekteres');

select is(private.compute_next_due(
    (select t from public.tasks t where id = '11111111-0000-0000-0000-000000000005'), '2027-10-03'),
  '2028-05-06'::date, 'utsatt oppgave gjort 3. okt → første lørdag i mai');

select is(private.roll_over_seasons('2027-10-04 00:30+02'), 1, '4. okt: den utsatte rulles');
select is((select row(next_due_on, postponed_from, postponed_to)::text
           from public.tasks where id = '11111111-0000-0000-0000-000000000005'),
  '(2028-05-06,,)', 'utsatt og ikke gjort → mai, og utsettelsen er nullstilt');

-- Jobben har ikke kjørt hele vinteren: rulles til første forekomst fra og med i dag.
update public.tasks set next_due_on = '2027-09-25' where id = '11111111-0000-0000-0000-000000000001';
-- Varmepumpa (frist 1. okt 2027) er også forfalt gjennom hele perioden og rulles til 1. okt 2028.
select is(private.roll_over_seasons('2028-05-10 12:00+02'), 2, 'jobben har stått over vinteren');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  '2028-05-13'::date, 'ikke forfalt siden i fjor: neste lørdag fra i dag');

-- ===========================================================================
-- 7. get_upcoming_occurrences over periodegrensen
-- ===========================================================================
update public.tasks set next_due_on = '2027-09-18' where id = '11111111-0000-0000-0000-000000000001';
select is(
  (select array_agg(due_on order by due_on)::text from public.get_upcoming_occurrences(
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2027-09-15', '2028-05-14')
   where task_id = '11111111-0000-0000-0000-000000000001'),
  '{2027-09-18,2027-09-25,2028-05-06,2028-05-13}',
  'kommende: ingen forekomster okt–apr, så første lørdag i mai');

-- ===========================================================================
-- 8. Rettigheter, aktivering og jobben
-- ===========================================================================
select is((select count(*)::int from cron.job where jobname = 'roll-over-seasons'), 1,
  'timesjobben roll-over-seasons finnes');

select tests.login_as('00000000-0000-0000-0000-00000000a001');

select throws_ok($$select private.roll_over_seasons()$$, '42501', null,
  'innloggede kan ikke kjøre roll_over_seasons');

select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  array[(select id from public.task_templates where slug = 'lawn-mow')]), 1, 'plenmalen aktiveres');
select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every, season_start_month, season_end_month)::text
   from public.tasks where template_id = (select id from public.task_templates where slug = 'lawn-mow')),
  '(interval,week,1,5,9)', 'aktivering kopierer perioden');
select is(
  (select next_due_on from public.tasks
   where template_id = (select id from public.task_templates where slug = 'lawn-mow')),
  (select private.season_start_on_or_after(t, private.household_today(t.household_id) + 7)
   from public.tasks t
   where template_id = (select id from public.task_templates where slug = 'lawn-mow')),
  'plenmalen: første frist én uke frem, eller periodens start');

select * from finish();
rollback;
