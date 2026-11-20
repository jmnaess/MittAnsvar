import { approvalBannerText, parseAmount, proposalMeta, proposalStatusChip } from '../format';

describe('proposalStatusChip', () => {
  it('venter', () => {
    expect(proposalStatusChip('pending', null)).toEqual({ label: 'Venter', tone: 'neutral' });
  });
  it('godkjent med lønn', () => {
    expect(proposalStatusChip('approved', 30)).toEqual({ label: 'Godkjent +30 kr', tone: 'money' });
  });
  it('godkjent uten lønn', () => {
    expect(proposalStatusChip('approved', null)).toEqual({ label: 'Godkjent', tone: 'neutral' });
  });
  it('avslått', () => {
    expect(proposalStatusChip('rejected', null)).toEqual({ label: 'Ikke denne gangen', tone: 'neutral' });
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
