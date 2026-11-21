import {
  advanceAfter,
  advanceNote,
  advanceText,
  advanceWarning,
  advanceWarningFor,
  balanceLine,
  earnedLabel,
  extraRewardText,
  extraRewardTitle,
  formatBalance,
  isAdvance,
} from '../format';

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

  it('viser saldo når det som venter, dekker forskuddet', () => {
    expect(formatBalance({ balance_nok: -5, pending_nok: 10 })).toBe('5 kr (10 kr venter)');
  });

  it('viser forskudd uten minus', () => {
    expect(formatBalance({ balance_nok: -30, pending_nok: 0 })).toBe('Forskudd: 30 kr');
    expect(formatBalance({ balance_nok: -30, pending_nok: 0 })).not.toContain('−');
    expect(formatBalance({ balance_nok: -30, pending_nok: 0 })).not.toContain('-');
  });

  it('viser forskudd med det som venter', () => {
    expect(formatBalance({ balance_nok: -40, pending_nok: 10 })).toBe('Forskudd: 30 kr (10 kr venter)');
  });
});

describe('isAdvance og balanceLine', () => {
  it('er forskudd bare når totalen er under 0', () => {
    expect(isAdvance({ balance_nok: -1, pending_nok: 0 })).toBe(true);
    expect(isAdvance({ balance_nok: 0, pending_nok: 0 })).toBe(false);
    expect(isAdvance({ balance_nok: -5, pending_nok: 10 })).toBe(false);
    expect(isAdvance(undefined)).toBe(false);
  });

  it('skriver «Opptjent» eller «Forskudd» i Husstand', () => {
    expect(balanceLine({ balance_nok: 35, pending_nok: 0 })).toBe('Opptjent: 35 kr');
    expect(balanceLine({ balance_nok: -30, pending_nok: 0 })).toBe('Forskudd: 30 kr');
    expect(balanceLine(undefined)).toBe('Opptjent: 0 kr');
  });

  it('forklarer forskuddet for voksne og på barnets enhet', () => {
    expect(advanceNote('Leah', false)).toBe('Det Leah tjener, går først til å betale ned forskuddet.');
    expect(advanceNote('Leah', true)).toBe('Det du tjener, går først til å betale ned forskuddet.');
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

  it('viser ingenting ved forskudd', () => {
    expect(earnedLabel({ balance_nok: -30, pending_nok: 0 })).toBeUndefined();
  });
});

describe('advanceAfter', () => {
  it('gir null når saldoen dekker beløpet', () => {
    expect(advanceAfter({ balance_nok: 20, pending_nok: 0 }, 20)).toBeNull();
    expect(advanceAfter({ balance_nok: 20, pending_nok: 0 }, 5)).toBeNull();
  });

  it('gir forskuddet etterpå', () => {
    expect(advanceAfter({ balance_nok: 10, pending_nok: 0 }, 40)).toBe(30);
    expect(advanceAfter({ balance_nok: -10, pending_nok: 0 }, 20)).toBe(30);
    expect(advanceAfter(undefined, 15)).toBe(15);
  });

  it('regner bare med godkjent, ikke det som venter', () => {
    expect(advanceAfter({ balance_nok: 0, pending_nok: 50 }, 10)).toBe(10);
  });

  it('gir null når ingenting trekkes (beløpet settes opp)', () => {
    expect(advanceAfter({ balance_nok: -10, pending_nok: 0 }, 0)).toBeNull();
    expect(advanceAfter({ balance_nok: -10, pending_nok: 0 }, -5)).toBeNull();
  });
});

describe('advanceWarning', () => {
  it('første forskudd', () => {
    expect(advanceWarning('Leah', 30, false)).toBe('Lønnen for denne er betalt ut. Dette gir Leah et forskudd på 30 kr.');
  });

  it('når barnet allerede har forskudd', () => {
    expect(advanceWarning('Leah', 30, true)).toBe('Lønnen for denne er betalt ut. Forskuddet blir 30 kr.');
  });

  it('utbetaling over saldoen', () => {
    expect(advanceText('Leah', 30, false)).toBe('Dette gir Leah et forskudd på 30 kr.');
  });

  it('advanceWarningFor bruker saldoen', () => {
    expect(advanceWarningFor({ balance_nok: 20, pending_nok: 0 }, 'Leah', 10)).toBeNull();
    expect(advanceWarningFor({ balance_nok: 5, pending_nok: 0 }, 'Leah', 20)).toBe(
      'Lønnen for denne er betalt ut. Dette gir Leah et forskudd på 15 kr.',
    );
    expect(advanceWarningFor({ balance_nok: -5, pending_nok: 0 }, 'Leah', 20)).toBe(
      'Lønnen for denne er betalt ut. Forskuddet blir 25 kr.',
    );
  });
});

describe('ekstra lønn', () => {
  it('bruker begrunnelsen som tittel', () => {
    expect(extraRewardTitle('Ekstra for at du hjalp Thelma')).toBe('Ekstra for at du hjalp Thelma');
    expect(extraRewardText(50, 'Ekstra for at du hjalp Thelma')).toBe('+50 kr · Ekstra for at du hjalp Thelma');
  });

  it('uten tekst: «Ekstra lønn»', () => {
    expect(extraRewardTitle(null)).toBe('Ekstra lønn');
    expect(extraRewardTitle('   ')).toBe('Ekstra lønn');
    expect(extraRewardText(50, null)).toBe('+50 kr · Ekstra lønn');
  });
});
