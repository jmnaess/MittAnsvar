// Felles oppgaver har assigned_member_id = null. I SQL er «= null» aldri sant, så felles må
// matches med «is null». Testen sjekker at spørringen bygges riktig.
type Call = [method: string, ...args: unknown[]];
const mockCalls: Call[] = [];

jest.mock('../../../lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'update', 'eq', 'is']) {
    builder[method] = (...args: unknown[]) => {
      mockCalls.push([method, ...args]);
      return builder;
    };
  }
  // Spørringen kjøres når den awaites.
  builder.then = (resolve: (r: unknown) => void) => resolve({ data: null, error: null, status: 204 });
  return { supabase: builder };
});

import { setRoutineRecurrence } from '../api';

const weekly = { recurrence_unit: 'week' as const, recurrence_every: 2, weekdays: [7], month_day: null };

beforeEach(() => {
  mockCalls.length = 0;
});

it('felles mal: assigned_member_id is null, aldri eq null', async () => {
  await setRoutineRecurrence('h1', 't1', null, weekly);
  expect(mockCalls).toContainEqual(['is', 'assigned_member_id', null]);
  expect(mockCalls).not.toContainEqual(['eq', 'assigned_member_id', null]);
});

it('barnemal: assigned_member_id eq barnet', async () => {
  await setRoutineRecurrence('h1', 't1', 'kid', weekly);
  expect(mockCalls).toContainEqual(['eq', 'assigned_member_id', 'kid']);
});

it('bare aktive oppgaver fra malen i husstanden, med ny gjentakelse', async () => {
  await setRoutineRecurrence('h1', 't1', null, weekly);
  expect(mockCalls).toEqual(
    expect.arrayContaining([
      ['from', 'tasks'],
      ['update', { recurrence_type: 'calendar', month: null, ...weekly }],
      ['eq', 'household_id', 'h1'],
      ['eq', 'template_id', 't1'],
      ['is', 'archived_at', null],
    ]),
  );
});
