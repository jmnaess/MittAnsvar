import type { TodayCompletion } from '../../completions/api';
import { boardAllCards, boardCards, memberTodayTaskIds } from '../board';
import { chooseBoardDoer } from '../chooseBoardDoer';
import { boardColumnCount, distributeCards, MAX_COLUMNS } from '../layout';
import type { BoardMember, BoardTask } from '../types';

function member(id: string, role: BoardMember['role'] = 'child'): BoardMember {
  return {
    id,
    household_id: 'h',
    role,
    display_name: id.toUpperCase(),
    avatar: 'fox',
    avatar_mode: 'figure',
    photo_path: null,
  };
}

function task(id: string, over: Partial<BoardTask> = {}): BoardTask {
  return {
    id,
    household_id: 'h',
    title: id,
    assigned_member_id: null,
    reward_nok: null,
    recurrence_type: 'interval',
    recurrence_unit: 'day',
    recurrence_every: 1,
    weekdays: null,
    month_day: null,
    month: null,
    job_repeats: false,
    job_member_ids: [],
    season_start_month: null,
    season_end_month: null,
    next_due_on: '2026-11-19',
    is_overdue: false,
    is_month_task: false,
    ...over,
  };
}

function done(id: string, over: Partial<TodayCompletion> = {}): TodayCompletion {
  return {
    id,
    household_id: 'h',
    task_id: `t-${id}`,
    completed_by_member_id: 'k',
    recorded_by: null,
    completed_at: '2026-11-19T10:00:00Z',
    reward_nok: null,
    status: 'approved',
    title: id,
    assigned_member_id: 'k',
    recurrence_type: 'interval',
    job_member_ids: [],
    is_latest: true,
    ...over,
  };
}

const adult = member('a', 'adult');
const k = member('k');
const l = member('l');
const members = [adult, k, l];

describe('boardCards', () => {
  it('viser alle personer, også uten oppgaver, og ingen tomme fellesskort', () => {
    const cards = boardCards({ tasks: [], members, completions: [] });
    expect(cards.map((c) => c.key)).toEqual(['a', 'k', 'l']);
  });

  it('legger oppgavene på riktig kort, i fast rekkefølge', () => {
    const cards = boardCards({
      members,
      completions: [],
      tasks: [
        task('til-k', { assigned_member_id: 'k' }),
        task('felles'),
        task('maned', { is_month_task: true }),
        task('jobb', { recurrence_type: 'job' }),
      ],
    });
    expect(cards.map((c) => c.key)).toEqual(['a', 'k', 'l', 'shared', 'jobs', 'this-month']);
    expect(cards[1].data.map((t) => t.id)).toEqual(['til-k']);
  });

  it('legger forfalt månedsoppgave hos personen', () => {
    const cards = boardCards({
      members,
      completions: [],
      tasks: [task('m', { is_month_task: true, is_overdue: true, assigned_member_id: 'l' })],
    });
    expect(cards.find((c) => c.key === 'l')?.data).toHaveLength(1);
    expect(cards.some((c) => c.key === 'this-month')).toBe(false);
  });

  it('viser utførte hos den ansvarlige, og felles utførte i «Felles»', () => {
    const cards = boardCards({
      members,
      tasks: [],
      completions: [done('1'), done('2', { assigned_member_id: null })],
    });
    expect(cards.find((c) => c.key === 'k')?.done.map((c) => c.id)).toEqual(['1']);
    expect(cards.find((c) => c.key === 'shared')?.done.map((c) => c.id)).toEqual(['2']);
  });
});

const yearly = { recurrence_type: 'calendar', recurrence_unit: 'year', recurrence_every: 1 } as const;

describe('boardAllCards («Alle»)', () => {
  const tasks = [
    task('felles'),
    task('felles-årlig', yearly),
    task('felles-sesong', { recurrence_unit: 'week', season_start_month: 4 }),
    task('felles-måned', { ...yearly, is_month_task: true }),
    task('k-årlig', { ...yearly, assigned_member_id: 'k' }),
    task('jobb', { recurrence_type: 'job' }),
  ];
  const ids = (cards: ReturnType<typeof boardCards>, key: string) =>
    cards.find((c) => c.key === key)?.data.map((t) => t.id);

  it('viser ikke felles årshjul-oppgaver i «Felles» eller «Denne måneden»', () => {
    const cards = boardAllCards({ members, completions: [], tasks });
    expect(ids(cards, 'shared')).toEqual(['felles']);
    expect(cards.some((c) => c.key === 'this-month')).toBe(false);
    expect(ids(cards, 'jobs')).toEqual(['jobb']);
  });

  it('personkortene er uendret, også årshjul-oppgaver på en person', () => {
    const cards = boardAllCards({ members, completions: [], tasks });
    expect(cards.filter((c) => c.member).map((c) => c.key)).toEqual(['a', 'k', 'l']);
    expect(ids(cards, 'k')).toEqual(['k-årlig']);
  });

  it('fjerner «Felles» når bare felles årshjul-oppgaver står der, men beholder utførte', () => {
    const only = [task('felles-årlig', yearly)];
    expect(boardAllCards({ members, completions: [], tasks: only }).some((c) => c.key === 'shared')).toBe(false);
    const withDone = boardAllCards({
      members,
      tasks: only,
      completions: [done('1', { assigned_member_id: null })],
    });
    expect(withDone.find((c) => c.key === 'shared')?.data).toEqual([]);
  });

  it('boardCards (personvisningen) har dem fortsatt', () => {
    const cards = boardCards({ members, completions: [], tasks });
    expect(ids(cards, 'shared')).toEqual(['felles', 'felles-årlig', 'felles-sesong']);
  });
});

describe('chooseBoardDoer', () => {
  it('felles årshjul-oppgave: velg bare blant voksne', () => {
    const b = member('b', 'adult');
    expect(chooseBoardDoer(task('t', yearly), [adult, b, k, l])).toEqual({ kind: 'pick', members: [adult, b] });
    expect(chooseBoardDoer(task('t', { ...yearly, is_month_task: true }), members)).toEqual({
      kind: 'direct',
      memberId: 'a',
    });
  });


  it('krysser av for den ansvarlige med ett trykk, også med lønn', () => {
    expect(chooseBoardDoer(task('t', { assigned_member_id: 'k' }), members)).toEqual({
      kind: 'direct',
      memberId: 'k',
    });
  });

  it('spør hvem på felles oppgaver, blant alle', () => {
    expect(chooseBoardDoer(task('t'), members)).toEqual({ kind: 'pick', members });
  });

  it('spør også når den ansvarlige ikke finnes lenger', () => {
    expect(chooseBoardDoer(task('t', { assigned_member_id: 'borte' }), members).kind).toBe('pick');
  });

  it('jobb for alle barna: velg blant barna, ikke voksne', () => {
    expect(chooseBoardDoer(task('j', { recurrence_type: 'job' }), members)).toEqual({
      kind: 'pick',
      members: [k, l],
    });
  });

  it('jobb for ett barn krysses av direkte', () => {
    expect(
      chooseBoardDoer(task('j', { recurrence_type: 'job', job_member_ids: ['l'] }), members),
    ).toEqual({ kind: 'direct', memberId: 'l' });
  });

  it('jobb uten barn i husstanden gjør ingenting', () => {
    expect(chooseBoardDoer(task('j', { recurrence_type: 'job' }), [adult])).toEqual({ kind: 'none' });
  });

  it('husstand med én person krysser av direkte', () => {
    expect(chooseBoardDoer(task('t'), [adult])).toEqual({ kind: 'direct', memberId: 'a' });
  });
});

describe('kolonner', () => {
  it('gir én kolonne på mobil og flere på iPad', () => {
    expect(boardColumnCount(390)).toBe(1);
    expect(boardColumnCount(820)).toBe(2);
    expect(boardColumnCount(1180)).toBe(3);
    expect(boardColumnCount(1366)).toBe(4);
  });

  it('går aldri over maks og aldri under én', () => {
    expect(boardColumnCount(5000)).toBe(MAX_COLUMNS);
    expect(boardColumnCount(100)).toBe(1);
  });

  it('fordeler etter rekkefølge, så kort ikke flytter seg', () => {
    expect(distributeCards(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'c', 'e'], ['b', 'd']]);
  });
});

describe('memberTodayTaskIds', () => {
  const k = member('k');
  const ola = member('ola');

  it('gir oppgavene på personens eget kort, ikke felles eller andres', () => {
    const board = {
      members: [k, ola],
      tasks: [
        task('a', { assigned_member_id: 'k' }),
        task('b', { assigned_member_id: 'k' }),
        task('felles'),
        task('olas', { assigned_member_id: 'ola' }),
      ],
      completions: [],
    };
    expect(memberTodayTaskIds(board, 'k').sort()).toEqual(['a', 'b']);
  });

  it('tom liste for en person som ikke finnes', () => {
    expect(memberTodayTaskIds({ members: [k], tasks: [], completions: [] }, 'x')).toEqual([]);
  });
});
