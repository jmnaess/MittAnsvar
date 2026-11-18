import { contrastRatio } from '../contrast';
import { jobColumns } from '../jobGrid';
import { colors, personColors, sharedColors } from '../theme';
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

describe('jobColumns', () => {
  it('full bredde for én, side om side for to og tre, tre i bredden ellers', () => {
    expect([0, 1, 2, 3, 4, 7].map(jobColumns)).toEqual([1, 1, 2, 3, 3, 3]);
  });
});

describe('kontrast', () => {
  // Hver tekstfarge mot bakgrunnene den brukes på. Kravet er 4.5:1 (WCAG AA for vanlig tekst).
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

  it.each(pairs)('%s har minst 4.5:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
