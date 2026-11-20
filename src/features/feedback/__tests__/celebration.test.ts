import { isLastOfToday, toCelebration } from '../celebration';

const base = {
  completionId: 'c1',
  feedbackText: 'Den tok du!',
  feedbackKind: 'regular' as const,
  rewardNok: null,
  pending: false,
};

describe('toCelebration', () => {
  it('vanlig: teksten fra serveren, kort varighet, ingen konfetti eller vrikk', () => {
    expect(toCelebration(base)).toEqual({
      completionId: 'c1',
      kind: 'regular',
      text: 'Den tok du!',
      reward: undefined,
      pending: false,
      durationMs: 2200,
      confetti: 0,
      wiggle: false,
    });
  });

  it('lønn: viser beløpet og om det venter på godkjenning', () => {
    const c = toCelebration({ ...base, rewardNok: 10, pending: true });
    expect(c.reward).toBe('+10 kr');
    expect(c.pending).toBe(true);
  });

  it('uten lønn venter ingenting på godkjenning', () => {
    expect(toCelebration({ ...base, pending: true }).pending).toBe(false);
  });

  it('siste for dagen: konfetti og lengre varighet', () => {
    const c = toCelebration({ ...base, feedbackKind: 'day_done' });
    expect(c.confetti).toBeGreaterThan(0);
    expect(c.durationMs).toBeGreaterThan(2200);
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
