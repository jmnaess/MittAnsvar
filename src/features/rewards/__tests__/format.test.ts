import { earnedLabel, formatBalance } from '../format';

describe('formatBalance', () => {
  it('tar med det som venter i tallet, og viser hvor mye som venter', () => {
    expect(formatBalance({ balance_nok: 25, pending_nok: 10 })).toBe('35 kr (10 kr venter)');
  });

  it('viser bare beløpet når ingenting venter', () => {
    expect(formatBalance({ balance_nok: 25, pending_nok: 0 })).toBe('25 kr');
  });

  it('viser 0 kr før saldoen er hentet', () => {
    expect(formatBalance(undefined)).toBe('0 kr');
  });

  it('godtar negativ godkjent saldo (utbetaling og så angring)', () => {
    expect(formatBalance({ balance_nok: -5, pending_nok: 10 })).toBe('5 kr (10 kr venter)');
  });
});

describe('earnedLabel', () => {
  it('summerer godkjent og venter', () => {
    expect(earnedLabel({ balance_nok: 25, pending_nok: 10 })).toBe('35 kr tjent');
  });

  it('viser ingenting uten saldo', () => {
    expect(earnedLabel({ balance_nok: 0, pending_nok: 0 })).toBeUndefined();
    expect(earnedLabel(undefined)).toBeUndefined();
  });
});
