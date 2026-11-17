import { formatTimeLeft, linkCodeUrl, parseLinkCode } from '../linkCode';

describe('parseLinkCode', () => {
  it('leser koden fra QR-lenken', () => {
    expect(parseLinkCode(linkCodeUrl('ABCDEFGH'))).toBe('ABCDEFGH');
  });

  it('godtar små bokstaver, mellomrom og bindestrek', () => {
    expect(parseLinkCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('avviser for korte og for lange koder', () => {
    expect(parseLinkCode('ABCD')).toBeNull();
    expect(parseLinkCode('ABCDEFGHJ')).toBeNull();
  });

  it('avviser QR-koder som ikke er våre', () => {
    expect(parseLinkCode('https://example.com')).toBeNull();
  });
});

describe('formatTimeLeft', () => {
  const now = new Date('2026-11-17T12:00:00Z').getTime();

  it('viser minutter og sekunder', () => {
    expect(formatTimeLeft('2026-11-17T12:09:05Z', now)).toBe('9:05');
  });

  it('viser 0:00 når tiden er ute', () => {
    expect(formatTimeLeft('2026-11-17T11:59:00Z', now)).toBe('0:00');
  });
});
