import { editHref, ROW_ACTION_LABELS, rowActions, rowPress, type RowFacts } from '../rowActions';

const labels = (row: RowFacts) => rowActions(row).map((a) => ROW_ACTION_LABELS[a]);

describe('rowActions: åpen oppgave i dag', () => {
  it('i fast rekkefølge, uten «Velg hvem» (trykk på raden gjør det)', () => {
    expect(labels({ kind: 'open', canPickDoer: true })).toEqual([
      'Utsett til …',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('én person i husstanden: ingen å velge', () => {
    expect(rowActions({ kind: 'open', canPickDoer: false })).toEqual(['postpone', 'edit', 'cancel']);
  });
});

describe('rowActions: «Kommende»', () => {
  it('nærmeste forekomst: utsett og endre, uten «Velg hvem» (trykk på raden gjør det)', () => {
    expect(labels({ kind: 'upcoming', checkable: true, canPickDoer: true })).toEqual([
      'Utsett til …',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('senere forekomst eller daglig oppgave: bare endre', () => {
    expect(rowActions({ kind: 'upcoming', checkable: false, canPickDoer: true })).toEqual(['edit', 'cancel']);
  });

  it('én person i husstanden: ingen å velge', () => {
    expect(rowActions({ kind: 'upcoming', checkable: true, canPickDoer: false })).toEqual(['postpone', 'edit', 'cancel']);
  });
});

describe('rowActions: utført i dag', () => {
  it('i fast rekkefølge, uten «Endre hvem» (trykk på raden gjør det)', () => {
    expect(labels({ kind: 'done', canReassign: true, canEdit: true })).toEqual([
      'Ikke gjort',
      'Endre oppgave',
      'Avbryt',
    ]);
  });

  it('ingen andre å flytte til', () => {
    expect(rowActions({ kind: 'done', canReassign: false, canEdit: true })).toEqual(['remove', 'edit', 'cancel']);
  });

  it('oppgaven er ikke aktiv (engangsjobb eller slettet)', () => {
    expect(rowActions({ kind: 'done', canReassign: true, canEdit: false })).toEqual(['remove', 'cancel']);
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

describe('rowPress: hva vanlig trykk gjør', () => {
  it('«Hvem gjorde …?» når det finnes noen å velge', () => {
    expect(rowPress({ kind: 'open', canPickDoer: true })).toBe('pickDoer');
    expect(rowPress({ kind: 'upcoming', checkable: true, canPickDoer: true })).toBe('pickDoer');
    expect(rowPress({ kind: 'done', canReassign: true, canEdit: true })).toBe('reassign');
  });

  it('ellers åpnes valgene', () => {
    expect(rowPress({ kind: 'open', canPickDoer: false })).toBe('menu');
    expect(rowPress({ kind: 'upcoming', checkable: false, canPickDoer: true })).toBe('menu');
    expect(rowPress({ kind: 'done', canReassign: false, canEdit: true })).toBe('menu');
    expect(rowPress({ kind: 'recent', canEdit: true })).toBe('menu');
  });

  it('«hvem»-valget forsvinner aldri: enten trykket eller menyen gir det', () => {
    const rows: RowFacts[] = [true, false].flatMap((a) =>
      [true, false].flatMap((b): RowFacts[] => [
        { kind: 'open', canPickDoer: a },
        { kind: 'upcoming', checkable: a, canPickDoer: b },
        { kind: 'done', canReassign: a, canEdit: b },
      ]),
    );
    for (const row of rows) {
      const canChoose =
        row.kind === 'open' ? row.canPickDoer
          : row.kind === 'upcoming' ? row.checkable && row.canPickDoer
            : row.kind === 'done' && row.canReassign;
      const inMenu = rowActions(row).some((a) => a === 'pickDoer' || a === 'reassign');
      expect(rowPress(row) !== 'menu' || inMenu).toBe(canChoose);
    }
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
