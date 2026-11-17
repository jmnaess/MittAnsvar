import { formatReminderBody, listTitles } from '../text';

describe('listTitles', () => {
  it('lister opptil fire titler med komma', () => {
    expect(listTitles(['Søppel', 'Rense sluk'])).toBe('Søppel, Rense sluk');
    expect(listTitles(['A', 'B', 'C', 'D'])).toBe('A, B, C, D');
  });

  it('korter av etter fire titler', () => {
    expect(listTitles(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C, D og 2 til');
  });
});

describe('formatReminderBody', () => {
  it('lister dagens oppgaver', () => {
    expect(formatReminderBody({ due: ['Søppel', 'Rense sluk'], overdueCount: 0, month: null }))
      .toBe('I dag: Søppel, Rense sluk');
  });

  it('nevner forfalte kort', () => {
    expect(formatReminderBody({ due: ['Søppel'], overdueCount: 2, month: null }))
      .toBe('I dag: Søppel + 2 forfalt');
  });

  it('gir en kort tekst når bare forfalte gjenstår', () => {
    expect(formatReminderBody({ due: [], overdueCount: 1, month: null }))
      .toBe('1 forfalt oppgave venter');
    expect(formatReminderBody({ due: [], overdueCount: 3, month: null }))
      .toBe('3 forfalte oppgaver venter');
  });

  it('legger månedsoppgaver på en egen linje', () => {
    expect(formatReminderBody({
      due: ['Søppel'],
      overdueCount: 0,
      month: { kind: 'start', titles: ['Rense takrenner'] },
    })).toBe('I dag: Søppel\nDenne måneden: Rense takrenner');

    expect(formatReminderBody({
      due: [],
      overdueCount: 0,
      month: { kind: 'last-week', titles: ['Rense takrenner'] },
    })).toBe('Fortsatt denne måneden: Rense takrenner');
  });

  it('gir null når det ikke er noe å si', () => {
    expect(formatReminderBody({ due: [], overdueCount: 0, month: null })).toBeNull();
    expect(formatReminderBody({ due: [], overdueCount: 0, month: { kind: 'start', titles: [] } }))
      .toBeNull();
  });
});
