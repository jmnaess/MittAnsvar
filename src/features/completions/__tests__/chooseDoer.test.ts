import type { Member } from '../../household/types';
import { chooseCompletionAction } from '../chooseDoer';

function member(id: string, role: 'adult' | 'child'): Member {
  return {
    id,
    role,
    household_id: 'h',
    display_name: id,
    avatar: 'fox',
    birth_year: null,
    auth_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const adult = member('voksen', 'adult');
const leah = member('leah', 'child');
const ola = member('ola', 'child');
const members = [adult, leah, ola];

const task = (overrides: Partial<{ recurrence_type: 'calendar' | 'job'; assigned_member_id: string | null; reward_nok: number | null }>) => ({
  recurrence_type: 'calendar' as const,
  assigned_member_id: null,
  reward_nok: null,
  ...overrides,
});

describe('chooseCompletionAction', () => {
  it('uten innlogget medlem skjer ingenting', () => {
    expect(chooseCompletionAction(task({}), undefined, members)).toEqual({ kind: 'none' });
  });

  it('oppgave uten lønn: ett trykk for den ansvarlige', () => {
    expect(chooseCompletionAction(task({ assigned_member_id: 'leah' }), adult, members)).toEqual({
      kind: 'direct',
      memberId: 'leah',
    });
  });

  it('felles oppgave: den som trykker', () => {
    expect(chooseCompletionAction(task({ reward_nok: 10 }), adult, members)).toEqual({
      kind: 'direct',
      memberId: 'voksen',
    });
  });

  it('voksen, oppgave med lønn tildelt et barn: barnet forhåndsvalgt, eller meg', () => {
    expect(
      chooseCompletionAction(task({ assigned_member_id: 'leah', reward_nok: 10 }), adult, members),
    ).toEqual({ kind: 'pick', members: [leah, adult], preselectedId: 'leah' });
  });

  it('voksen, åpen jobb: velg blant barna', () => {
    expect(chooseCompletionAction(task({ recurrence_type: 'job', reward_nok: 15 }), adult, members)).toEqual({
      kind: 'pick',
      members: [leah, ola],
      preselectedId: null,
    });
  });

  it('voksen, jobb for ett barn med lønn: barnet forhåndsvalgt, eller meg', () => {
    expect(
      chooseCompletionAction(
        task({ recurrence_type: 'job', assigned_member_id: 'ola', reward_nok: 5 }),
        adult,
        members,
      ),
    ).toEqual({ kind: 'pick', members: [ola, adult], preselectedId: 'ola' });
  });

  it('voksen, åpen jobb uten barn i husstanden: meg', () => {
    expect(chooseCompletionAction(task({ recurrence_type: 'job' }), adult, [adult])).toEqual({
      kind: 'direct',
      memberId: 'voksen',
    });
  });

  it('barn krysser av en jobb for seg selv', () => {
    expect(chooseCompletionAction(task({ recurrence_type: 'job', reward_nok: 5 }), leah, members)).toEqual({
      kind: 'direct',
      memberId: 'leah',
    });
  });
});
