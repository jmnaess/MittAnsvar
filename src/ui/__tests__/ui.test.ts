import { contrastRatio } from '../contrast';
import { familyStripLayout, RING_MAX, SCROLL_RING, shortName } from '../familyStripLayout';
import { avatarStackLayout } from '../avatarStackLayout';
import { jobColumns } from '../jobGrid';
import { parsePreference, resolveScheme } from '../appearance';
import { darkColors, lightColors, themes, type Theme } from '../theme';
import { waitingText } from '../waitingText';

describe('waitingText', () => {
  it('lister opptil tre navn og teller resten', () => {
    expect(waitingText([])).toBe('');
    expect(waitingText(['Leah'])).toBe('Leah venter');
    expect(waitingText(['Leah', 'Jesper'])).toBe('Leah og Jesper venter');
    expect(waitingText(['Leah', 'Jesper', 'Iver'])).toBe('Leah, Jesper og Iver venter');
    expect(waitingText(['Leah', 'Jesper', 'Iver', 'Ada'])).toBe('Leah, Jesper og 2 til venter');
  });
});

describe('avatarStackLayout', () => {
  it('viser opptil max, resten blir «+N»', () => {
    expect(avatarStackLayout(2, 3)).toEqual({ shown: 2, extra: 0 });
    expect(avatarStackLayout(3, 3)).toEqual({ shown: 3, extra: 0 });
    expect(avatarStackLayout(4, 3)).toEqual({ shown: 3, extra: 1 });
  });
});

describe('jobColumns', () => {
  it('full bredde for én, side om side for to og tre, tre i bredden ellers', () => {
    expect([0, 1, 2, 3, 4, 7].map(jobColumns)).toEqual([1, 1, 2, 3, 3, 3]);
  });
});

describe('familyStripLayout', () => {
  // 390 px skjerm − 2 × 20 px sidepadding.
  const width = 350;

  it('få personer: største ring, og hver får maks 72 px', () => {
    expect(familyStripLayout(2, width)).toEqual({ ring: RING_MAX, cellWidth: 72, scrolls: false });
  });

  it('seks personer: ringen krymper så alle får plass på én rad', () => {
    // 350 / 6 = 58,3 per person, ring = 58 − 8 = 50.
    const layout = familyStripLayout(6, width);
    expect(layout.scrolls).toBe(false);
    expect(layout.ring).toBe(50);
    expect(layout.cellWidth * 6).toBeLessThanOrEqual(width);
  });

  it('seks personer på en smal skjerm: fortsatt én rad', () => {
    const layout = familyStripLayout(6, 320 - 40);
    expect(layout.scrolls).toBe(false);
    expect(layout.cellWidth * 6).toBeLessThanOrEqual(280);
  });

  it('sju eller flere: fast størrelse, og raden kan sveipes', () => {
    const scrolling = { ring: SCROLL_RING, cellWidth: 64, scrolls: true };
    expect(familyStripLayout(7, width)).toEqual(scrolling);
    expect(familyStripLayout(7, 768 - 40)).toEqual(scrolling);
  });
});

describe('shortName', () => {
  it('ett navn som det er, ellers fornavn og forbokstav med punktum', () => {
    expect(shortName('Leah')).toBe('Leah');
    expect(shortName('John Martin')).toBe('John M.');
    expect(shortName('Ola Nordmann Hansen')).toBe('Ola N.');
    expect(shortName('  Kari  ')).toBe('Kari');
    expect(shortName('Anne-Marie hansen')).toBe('Anne-Marie H.');
    expect(shortName('Leah Ødegård')).toBe('Leah Ø.');
  });
});

/** Hver tekstfarge mot bakgrunnene den brukes på. Kravet er 4.5:1 (WCAG AA for vanlig tekst). */
function textPairs({ colors, personColors, sharedColors }: Theme): [string, string, string][] {
  const pairs: [string, string, string][] = [];
  for (const text of ['text', 'textMuted', 'textWarm', 'primary', 'danger'] as const) {
    for (const bg of ['background', 'surface', 'surfaceMuted'] as const) {
      pairs.push([`${text} på ${bg}`, colors[text], colors[bg]]);
    }
  }
  pairs.push(
    ['onPrimary på primary', colors.onPrimary, colors.primary],
    ['onPrimary på primaryPressed', colors.onPrimary, colors.primaryPressed],
    ['onPrimary på danger', colors.onPrimary, colors.danger],
    ['danger på jobBg', colors.danger, colors.jobBg],
    ['toastText på toastBg', colors.toastText, colors.toastBg],
    ['toastMuted på toastBg', colors.toastMuted, colors.toastBg],
    ['toastAction på toastBg', colors.toastAction, colors.toastBg],
    ['primary på jobBg', colors.primary, colors.jobBg],
    ['text på jobBg', colors.text, colors.jobBg],
    ['moneyText på moneyBg', colors.moneyText, colors.moneyBg],
    ['moneyText på surface', colors.moneyText, colors.surface],
    ['overdueText på overdueBg', colors.overdueText, colors.overdueBg],
    ['jobAmount på jobBg', colors.jobAmount, colors.jobBg],
    ['jobSub på jobBg', colors.jobSub, colors.jobBg],
    ['text på sunSoft', colors.text, colors.sunSoft],
    ['textWarm på sunSoft', colors.textWarm, colors.sunSoft],
    ['primary på sunSoft', colors.primary, colors.sunSoft],
    ['Felles ink på tint', sharedColors.ink, sharedColors.tint],
    ['textMuted på Felles tint', colors.textMuted, sharedColors.tint],
  );
  for (const [key, c] of Object.entries(personColors)) {
    pairs.push([`${key} ink på tint`, c.ink, c.tint]);
    pairs.push([`textMuted på ${key} tint`, colors.textMuted, c.tint]);
  }
  return pairs;
}

/**
 * Ting som ikke er tekst, men som må synes: tom sjekkboks, personens ring og haken i en avkrysset
 * sjekkboks. Kravet er 3:1 (WCAG 1.4.11, grafikk og ikoner).
 * Ringen står på hvite rader og surfaceMuted-rader (sjekkboksen), og på personens tint (kanten i
 * «Hvem gjorde det?»).
 */
function nonTextPairs({ colors, personColors, sharedColors }: Theme): [string, string, string][] {
  const pairs: [string, string, string][] = [
    ['checkboxBorder på surface', colors.checkboxBorder, colors.surface],
    ['checkboxBorder på surfaceMuted', colors.checkboxBorder, colors.surfaceMuted],
  ];
  for (const [key, c] of Object.entries({ ...personColors, Felles: sharedColors })) {
    pairs.push([`${key} ring på tint`, c.ring, c.tint]);
    pairs.push([`${key} ring på surface`, c.ring, colors.surface]);
    pairs.push([`${key} ring på surfaceMuted`, c.ring, colors.surfaceMuted]);
  }
  return pairs;
}

function checkPairs({ colors, personColors, sharedColors }: Theme): [string, string, string][] {
  return Object.entries({ ...personColors, Felles: sharedColors }).map(([key, c]) => [
    `onRing på ${key} ring`,
    colors.onRing,
    c.ring,
  ]);
}

describe.each([
  ['lyst', themes.light],
  ['mørkt', themes.dark],
])('kontrast, %s tema', (_name, theme) => {
  it.each(textPairs(theme))('%s har minst 4.5:1', (_pair, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each([...nonTextPairs(theme), ...checkPairs(theme)])('%s har minst 3:1', (_pair, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('temaene', () => {
  it('lyst og mørkt har de samme fargetokenene og de samme personene', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
    expect(Object.keys(themes.dark.personColors).sort()).toEqual(Object.keys(themes.light.personColors).sort());
  });
});

describe('utseende', () => {
  it('lagret verdi: lys og mørk som de er, alt annet følger telefonen', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
    expect(parsePreference('system')).toBe('system');
    expect(parsePreference(null)).toBe('system');
    expect(parsePreference('tull')).toBe('system');
  });

  it('eget valg vinner, ellers telefonens innstilling, ellers lyst', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });
});
