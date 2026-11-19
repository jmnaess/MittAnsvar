import { editHref, ROW_ACTION_LABELS, rowActions, type RowFacts } from '../rowActions';

const labels = (row: RowFacts) => rowActions(row).map((a) => ROW_ACTION_LABELS[a]);

describe('rowActions: åpen oppgave i dag', () => {
  it('alle valgene, i fast rekkefølge', () => {
    expect(labels({ kind: 'open', canPickDoer: true })).toEqual([
      'Utsett til …',
      'Velg hvem som gjorde det',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('én person i husstanden: ingen å velge', () => {
    expect(rowActions({ kind: 'open', canPickDoer: false })).toEqual(['postpone', 'edit', 'cancel']);
  });
});

describe('rowActions: «Kommende»', () => {
  it('kan krysses av tidlig', () => {
    expect(labels({ kind: 'upcoming', checkable: true, canPickDoer: true })).toEqual([
      'Velg hvem som gjorde det',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('kan ikke krysses av tidlig: bare endre', () => {
    expect(rowActions({ kind: 'upcoming', checkable: false, canPickDoer: true })).toEqual(['edit', 'cancel']);
  });

  it('én person i husstanden: ingen å velge', () => {
    expect(rowActions({ kind: 'upcoming', checkable: true, canPickDoer: false })).toEqual(['edit', 'cancel']);
  });
});

describe('rowActions: utført i dag', () => {
  it('alle valgene, i fast rekkefølge', () => {
    expect(labels({ kind: 'done', canReassign: true, canEdit: true })).toEqual([
      'Ikke gjort',
      'Endre hvem som gjorde det',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('ingen andre å flytte til', () => {
    expect(rowActions({ kind: 'done', canReassign: false, canEdit: true })).toEqual(['remove', 'edit', 'cancel']);
  });

  it('oppgaven er ikke aktiv (engangsjobb eller slettet)', () => {
    expect(rowActions({ kind: 'done', canReassign: true, canEdit: false })).toEqual(['remove', 'reassign', 'cancel']);
  });
});

describe('rowActions: «Gjort siste 3 dager»', () => {
  it('bare endre, ikke rette avkrysningen', () => {
    expect(labels({ kind: 'recent', canEdit: true })).toEqual(['Endre oppgave', 'Avbryt']);
  });

  it('oppgaven er ikke aktiv: ingenting å gjøre', () => {
    expect(rowActions({ kind: 'recent', canEdit: false })).toEqual(['cancel']);
  });
});

describe('editHref', () => {
  it('jobb til jobbskjemaet', () => {
    expect(editHref('a', 'job')).toEqual({ pathname: '/job/[id]', params: { id: 'a' } });
  });

  it('andre oppgaver til oppgaveskjemaet', () => {
    expect(editHref('a', 'calendar')).toEqual({ pathname: '/task/[id]', params: { id: 'a' } });
    expect(editHref('a', 'once')).toEqual({ pathname: '/task/[id]', params: { id: 'a' } });
  });
});
