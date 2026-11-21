import {
  celebrationDurationMs,
  countWords,
  HEADLINE_PAID,
  HEADLINE_UNPAID,
  isLastOfToday,
  pickRewardText,
  RED_HEART,
  resetRewardTextMemory,
  REWARD_TEXTS,
  toCelebration,
} from '../celebration';

const base = {
  completionId: 'c1',
  feedbackText: 'Den tok du!',
  feedbackKind: 'regular' as const,
  rewardNok: null,
  pending: false,
};

beforeEach(() => resetRewardTextMemory());

describe('overskriften', () => {
  it('hjertet har variasjonsvelger, så iOS viser rødt emoji-hjerte', () => {
    expect(RED_HEART).toBe('\u2764\uFE0F');
    expect(RED_HEART).toContain('\uFE0F');
    expect(HEADLINE_UNPAID).toContain('\uFE0F');
    expect(HEADLINE_UNPAID).toBe('❤️-ching!');
    expect(HEADLINE_PAID).toBe('Ka-ching!');
  });

  it('skjermleseren får alltid «Bra jobba!»', () => {
    for (const c of [
      toCelebration(base),
      toCelebration({ ...base, rewardNok: 20 }),
      toCelebration({ ...base, feedbackKind: 'young' }),
      toCelebration({ ...base, feedbackKind: 'day_done', rewardNok: 20 }),
    ]) {
      expect(c.headlineLabel).toBe('Bra jobba!');
    }
  });
});

describe('toCelebration', () => {
  it('uten lønn: ❤️-ching!, hjerter, servertekst, haptikk', () => {
    expect(toCelebration(base)).toEqual({
      completionId: 'c1',
      kind: 'regular',
      headline: '❤️-ching!',
      headlineLabel: 'Bra jobba!',
      text: 'Den tok du!',
      reward: undefined,
      pending: false,
      // «Den tok du!»: 3 ord → 3,5 s + 3 × 0,4 s
      durationMs: 4700,
      particles: 'hearts',
      particleCount: 12,
      confetti: 0,
      haptic: true,
      wiggle: false,
    });
  });

  it('lønn som venter: Ka-ching!, mynter, lønnstekst og «+20 kr på vei»', () => {
    const c = toCelebration({ ...base, rewardNok: 20, pending: true });
    expect(c.headline).toBe('Ka-ching!');
    expect(c.particles).toBe('coins');
    expect(c.reward).toBe('+20 kr på vei');
    expect(c.pending).toBe(true);
    expect(REWARD_TEXTS).toContain(c.text);
    expect(c.haptic).toBe(true);
    expect(c.confetti).toBe(0);
  });

  it('lønn godkjent med en gang: «+20 kr»', () => {
    const c = toCelebration({ ...base, rewardNok: 20 });
    expect(c.headline).toBe('Ka-ching!');
    expect(c.reward).toBe('+20 kr');
    expect(c.pending).toBe(false);
    expect(REWARD_TEXTS).toContain(c.text);
  });

  it('samme haptikk med og uten lønn, så begge føles like', () => {
    expect(toCelebration(base).haptic).toBe(true);
    expect(toCelebration({ ...base, rewardNok: 20 }).haptic).toBe(true);
  });

  it('lønnsteksten kommer ikke to ganger på rad', () => {
    let previous = toCelebration({ ...base, rewardNok: 20 }).text;
    for (let i = 0; i < 30; i++) {
      const next = toCelebration({ ...base, rewardNok: 20 }).text;
      expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it('uten lønn venter ingenting på godkjenning', () => {
    expect(toCelebration({ ...base, pending: true }).pending).toBe(false);
    expect(toCelebration({ ...base, pending: true }).reward).toBeUndefined();
  });

  it('5 år eller yngre: hjerter, enkel tekst og vrikk, også med lønn, men ingen haptikk', () => {
    const c = toCelebration({ ...base, feedbackKind: 'young', feedbackText: 'Hurra!', rewardNok: 20, pending: true });
    expect(c.headline).toBe('❤️-ching!');
    expect(c.particles).toBe('hearts');
    expect(c.text).toBe('Hurra!');
    expect(c.reward).toBe('+20 kr på vei');
    expect(c.wiggle).toBe(true);
    expect(c.haptic).toBe(false);
  });

  it('siste for dagen uten lønn: konfetti og hjerter, servertekst, 1,5 s ekstra', () => {
    const c = toCelebration({ ...base, feedbackKind: 'day_done' });
    expect(c.confetti).toBeGreaterThan(0);
    expect(c.particles).toBe('hearts');
    expect(c.particleCount).toBeGreaterThan(0);
    expect(c.headline).toBe('❤️-ching!');
    expect(c.text).toBe('Den tok du!');
    expect(c.durationMs).toBe(4700 + 1500);
    expect(c.wiggle).toBe(false);
  });

  it('siste for dagen med lønn: konfetti og mynter, servertekst beholdes', () => {
    const c = toCelebration({ ...base, feedbackKind: 'day_done', feedbackText: 'Alt er gjort i dag! 🎉', rewardNok: 20 });
    expect(c.confetti).toBeGreaterThan(0);
    expect(c.particles).toBe('coins');
    expect(c.headline).toBe('Ka-ching!');
    expect(c.text).toBe('Alt er gjort i dag! 🎉');
    expect(c.reward).toBe('+20 kr');
  });

  it('beløpslinjen teller med i visningstiden, overskriften ikke', () => {
    // Servertekst for de minste (ikke tilfeldig): «Hurra!» 1 ord
    // + «+20 kr på vei» 4 ord = 5 ord → 3,5 s + 2,0 s
    expect(
      toCelebration({ ...base, feedbackKind: 'young', feedbackText: 'Hurra!', rewardNok: 20, pending: true }).durationMs,
    ).toBe(5500);
    // Godkjent: 1 + 2 = 3 ord
    expect(toCelebration({ ...base, feedbackKind: 'young', feedbackText: 'Hurra!', rewardNok: 20 }).durationMs).toBe(4700);
  });

  it('uten tekst fra serveren: en standardtekst per gruppe', () => {
    expect(toCelebration({ ...base, feedbackText: null }).text).toBe('Godt gjort!');
    expect(toCelebration({ ...base, feedbackText: null, feedbackKind: 'day_done' }).text).toBe(
      'Alt er gjort i dag! 🎉',
    );
    expect(toCelebration({ ...base, feedbackText: null, feedbackKind: 'young' }).text).toBe('Hurra!');
  });
});

describe('pickRewardText', () => {
  it('velger aldri forrige tekst', () => {
    for (const previous of REWARD_TEXTS) {
      for (const r of [0, 0.5, 0.9999]) {
        expect(pickRewardText(previous, () => r)).not.toBe(previous);
      }
    }
  });

  it('uten forrige tekst kan alle velges', () => {
    expect(pickRewardText(null, () => 0)).toBe(REWARD_TEXTS[0]);
    expect(pickRewardText(null, () => 0.9999)).toBe(REWARD_TEXTS[REWARD_TEXTS.length - 1]);
  });

  it('10 korte tekster som roser innsats, ikke «flink»', () => {
    expect(REWARD_TEXTS).toHaveLength(10);
    expect(REWARD_TEXTS.some((t) => /flink/i.test(t))).toBe(false);
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
