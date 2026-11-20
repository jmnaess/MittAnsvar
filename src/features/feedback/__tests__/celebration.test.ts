import { celebrationDurationMs, countWords, isLastOfToday, toCelebration } from '../celebration';

const base = {
  completionId: 'c1',
  feedbackText: 'Den tok du!',
  feedbackKind: 'regular' as const,
  rewardNok: null,
  pending: false,
};

describe('toCelebration', () => {
  it('vanlig: teksten fra serveren, ingen konfetti eller vrikk', () => {
    expect(toCelebration(base)).toEqual({
      completionId: 'c1',
      kind: 'regular',
      text: 'Den tok du!',
      reward: undefined,
      pending: false,
      // «Den tok du!»: 3 ord → 3,5 s + 3 × 0,4 s
      durationMs: 4700,
      confetti: 0,
      wiggle: false,
    });
  });

  it('lønn: viser beløpet og om det venter på godkjenning', () => {
    const c = toCelebration({ ...base, rewardNok: 10, pending: true });
    expect(c.reward).toBe('+10 kr');
    expect(c.pending).toBe(true);
  });

  it('lønn og «Venter på godkjenning» teller med i visningstiden', () => {
    // 3 ord i teksten + 2 («+10 kr») + 3 («Venter på godkjenning») = 8 ord → 3,5 s + 3,2 s
    expect(toCelebration({ ...base, rewardNok: 10, pending: true }).durationMs).toBe(6700);
    // Godkjent lønn: 3 + 2 = 5 ord
    expect(toCelebration({ ...base, rewardNok: 10 }).durationMs).toBe(5500);
  });

  it('uten lønn venter ingenting på godkjenning', () => {
    expect(toCelebration({ ...base, pending: true }).pending).toBe(false);
  });

  it('siste for dagen: konfetti og 1,5 s ekstra', () => {
    const c = toCelebration({ ...base, feedbackKind: 'day_done' });
    expect(c.confetti).toBeGreaterThan(0);
    expect(c.durationMs).toBe(4700 + 1500);
    expect(c.wiggle).toBe(false);
  });

  it('5 år eller yngre: vrikk', () => {
    expect(toCelebration({ ...base, feedbackKind: 'young' }).wiggle).toBe(true);
  });

  it('uten tekst fra serveren: en standardtekst per gruppe', () => {
    expect(toCelebration({ ...base, feedbackText: null }).text).toBe('Godt gjort!');
    expect(toCelebration({ ...base, feedbackText: null, feedbackKind: 'day_done' }).text).toBe(
      'Alt er gjort i dag! 🎉',
    );
    expect(toCelebration({ ...base, feedbackText: null, feedbackKind: 'young' }).text).toBe('Hurra!');
  });
});

describe('isLastOfToday', () => {
  it('sann når oppgaven er den eneste som gjenstår', () => {
    expect(isLastOfToday(['a'], 'a')).toBe(true);
  });
  it('usann når flere gjenstår, eller oppgaven ikke står i listen', () => {
    expect(isLastOfToday(['a', 'b'], 'a')).toBe(false);
    expect(isLastOfToday(['b'], 'a')).toBe(false);
    expect(isLastOfToday([], 'a')).toBe(false);
  });
});

describe('countWords', () => {
  it('teller ord med bokstaver eller tall, ikke emoji eller tankestrek', () => {
    expect(countWords('Høy fem! ✋')).toBe(2);
    expect(countWords('Ferdig – og bra gjort.')).toBe(4);
    expect(countWords('+10 kr')).toBe(2);
    expect(countWords('')).toBe(0);
  });
});

describe('celebrationDurationMs', () => {
  it('3,5 s + 0,4 s per ord', () => {
    expect(celebrationDurationMs('regular', ['Hurra!'])).toBe(3900);
    expect(celebrationDurationMs('young', ['Så fint du gjorde det!'])).toBe(5500);
  });

  it('teller ord i alle tekstene som vises', () => {
    expect(celebrationDurationMs('regular', ['Den tok du!', '+10 kr'])).toBe(5500);
  });

  it('maks 7 s', () => {
    expect(celebrationDurationMs('regular', ['ord '.repeat(20)])).toBe(7000);
  });

  it('siste for dagen: 1,5 s ekstra, maks 8,5 s', () => {
    expect(celebrationDurationMs('day_done', ['Alt er gjort i dag! 🎉'])).toBe(3500 + 5 * 400 + 1500);
    expect(celebrationDurationMs('day_done', ['ord '.repeat(20)])).toBe(8500);
  });
});
