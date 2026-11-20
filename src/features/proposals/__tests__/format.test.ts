import {
  approvalBannerText,
  parseAmount,
  proposalAction,
  proposalMeta,
  proposalStatusChip,
  visibleMyProposals,
} from '../format';

describe('proposalAction', () => {
  it('vil gjøre, uten lønn: «Legg til» (oppgave med en gang)', () => {
    expect(proposalAction(false, false)).toEqual({ kind: 'add', label: 'Legg til' });
  });
  it('gjort, uten lønn: «Registrer» (utført med en gang)', () => {
    expect(proposalAction(true, false)).toEqual({ kind: 'register', label: 'Registrer' });
  });
  it('med lønn: «Send til de voksne», både gjort og vil gjøre', () => {
    expect(proposalAction(true, true)).toEqual({ kind: 'send', label: 'Send til de voksne' });
    expect(proposalAction(false, true)).toEqual({ kind: 'send', label: 'Send til de voksne' });
  });
  it('mangler et valg: ingen handling (knappen er av), teksten følger det som er valgt', () => {
    expect(proposalAction(null, null)).toEqual({ kind: null, label: 'Legg til' });
    expect(proposalAction(true, null)).toEqual({ kind: null, label: 'Registrer' });
    expect(proposalAction(null, true)).toEqual({ kind: null, label: 'Send til de voksne' });
  });
});

describe('proposalStatusChip', () => {
  it('venter', () => {
    expect(proposalStatusChip('pending')).toEqual({ label: 'Venter', tone: 'neutral' });
  });
  it('avslått', () => {
    expect(proposalStatusChip('rejected')).toEqual({ label: 'Ikke denne gangen', tone: 'neutral' });
  });
});

describe('visibleMyProposals', () => {
  it('viser de som venter og avslag, ikke godkjente', () => {
    const list = [
      { id: 'a', status: 'pending' as const },
      { id: 'b', status: 'approved' as const },
      { id: 'c', status: 'rejected' as const },
    ];
    expect(visibleMyProposals(list).map((p) => p.id)).toEqual(['a', 'c']);
  });
});

describe('proposalMeta', () => {
  it('gjort, ønsker beløp', () => {
    expect(proposalMeta({ is_done: true, wants_reward: true, proposed_nok: 30 })).toBe('Gjort · ønsker 30 kr');
  });
  it('vil gjøre, ønsker lønn uten beløp', () => {
    expect(proposalMeta({ is_done: false, wants_reward: true, proposed_nok: null })).toBe(
      'Vil gjøre det · ønsker lønn',
    );
  });
  it('uten lønn', () => {
    expect(proposalMeta({ is_done: true, wants_reward: false, proposed_nok: null })).toBe('Gjort · uten lønn');
  });
});

describe('parseAmount', () => {
  it('tomt er 0', () => expect(parseAmount('  ', 200)).toBe(0));
  it('tall', () => expect(parseAmount('30', 200)).toBe(30));
  it('over max er ugyldig', () => expect(parseAmount('201', 200)).toBeNull());
  it('ikke tall er ugyldig', () => expect(parseAmount('3,5', 200)).toBeNull());
});

describe('approvalBannerText', () => {
  const base = { names: [], proposalNames: [], completionCount: 0, completionTotal: 0, proposalCount: 0 };

  it('ett forslag', () => {
    expect(approvalBannerText({ ...base, names: ['Leah'], proposalNames: ['Leah'], proposalCount: 1 })).toEqual({
      title: 'Leah har et forslag',
      meta: '1 forslag',
    });
  });
  it('flere forslag fra ett barn', () => {
    expect(approvalBannerText({ ...base, names: ['Leah'], proposalNames: ['Leah'], proposalCount: 2 }).title).toBe(
      'Leah har 2 forslag',
    );
  });
  it('forslag fra flere barn', () => {
    expect(
      approvalBannerText({ ...base, names: ['Leah', 'Ola'], proposalNames: ['Leah', 'Ola'], proposalCount: 2 }).title,
    ).toBe('Leah og Ola har forslag');
  });
  it('bare avkrysninger: som før', () => {
    expect(approvalBannerText({ ...base, names: ['Leah'], completionCount: 2, completionTotal: 35 })).toEqual({
      title: 'Leah venter',
      meta: '2 til godkjenning · 35 kr',
    });
  });
  it('begge', () => {
    expect(
      approvalBannerText({
        names: ['Leah', 'Ola'],
        proposalNames: ['Ola'],
        completionCount: 2,
        completionTotal: 35,
        proposalCount: 1,
      }),
    ).toEqual({ title: 'Leah og Ola venter', meta: '2 til godkjenning · 35 kr · 1 forslag' });
  });
});
