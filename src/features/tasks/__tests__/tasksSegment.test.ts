import type { TaskInput } from '../types';

const mockStore = new Map<string, string>();

jest.mock('../../../lib/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

// Ny modul i hver test, så tilstanden i minnet starter tom.
const load = () => require('../tasksSegment') as typeof import('../tasksSegment');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const input = (overrides: Partial<TaskInput>): TaskInput => ({
  title: 'Oppgave',
  category: 'other',
  assigned_member_id: null,
  job_member_ids: [],
  reward_nok: null,
  once_on: null,
  recurrence_type: 'calendar',
  recurrence_unit: 'week',
  recurrence_every: 1,
  weekdays: [1],
  month_day: null,
  month: null,
  job_repeats: false,
  season_start_month: null,
  season_end_month: null,
  ...overrides,
});

beforeEach(() => {
  mockStore.clear();
  jest.resetModules();
});

it('lagrer valgt segment', async () => {
  const { setTasksSegment } = load();
  setTasksSegment('year');
  await flush();
  expect(mockStore.get('tasks.segment')).toBe('year');
});

it('et valg før det lagrede er lest, skriver ikke det lagrede over valget', async () => {
  mockStore.set('tasks.segment', 'everyday');
  const { setTasksSegment } = load();
  setTasksSegment('year');
  await flush();
  expect(mockStore.get('tasks.segment')).toBe('year');
});

it('revealSaved: årsoppgave gir Årshjul og måneden', () => {
  const { revealSaved, takeReveal } = load();
  revealSaved([input({ recurrence_unit: 'year', month: 4 }), input({ recurrence_unit: 'year', month: 9 })], 1000);
  expect(takeReveal()).toEqual({ segment: 'year', sectionKey: 'month-4', at: 1000 });
  expect(takeReveal()).toBeNull();
});

it('revealSaved: langt intervall gir «Med jevne mellomrom», ukentlig gir Hverdag', () => {
  const { revealSaved, takeReveal } = load();
  revealSaved([input({ recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 3 })], 0);
  expect(takeReveal()?.sectionKey).toBe('interval');
  revealSaved([input({})], 0);
  expect(takeReveal()).toEqual({ segment: 'everyday', sectionKey: null, at: 0 });
});

it('isFromTasks: bare skjemaer åpnet fra «Oppgaver»', () => {
  const { FROM_TASKS, isFromTasks } = load();
  expect(isFromTasks(FROM_TASKS)).toBe(true);
  expect(isFromTasks({})).toBe(false);
});
