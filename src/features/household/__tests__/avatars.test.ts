import { avatarArt, avatarArtFor, FALLBACK_AVATAR } from '../../../ui/avatarArt';
import { personColorIn, themes } from '../../../ui/theme';
import { AVATAR_KEYS, avatarLabel } from '../avatars';

describe('avatarer', () => {
  it('hver figur har tegning, farge i begge temaer og en nøkkel databasen godtar', () => {
    for (const key of AVATAR_KEYS) {
      expect(avatarArt[key]).toBeDefined();
      expect(themes.light.personColors[key]).toBeDefined();
      expect(themes.dark.personColors[key]).toBeDefined();
      // Samme sjekk som set_my_avatar i databasen.
      expect(key).toMatch(/^[a-z_]{1,30}$/);
    }
  });

  it('alle tegninger og farger hører til en figur i velgeren', () => {
    expect(Object.keys(avatarArt).sort()).toEqual([...AVATAR_KEYS].sort());
    expect(Object.keys(themes.light.personColors).sort()).toEqual([...AVATAR_KEYS].sort());
  });

  it('har minst 18 figurer', () => {
    expect(AVATAR_KEYS.length).toBeGreaterThanOrEqual(18);
  });

  it('ukjent nøkkel (en eldre app ser en nyere figur) gir reven, aldri tomt', () => {
    expect(FALLBACK_AVATAR).toBe('fox');
    expect(avatarArtFor('dragon')).toBe(avatarArt.fox);
    expect(avatarArtFor('')).toBe(avatarArt.fox);
    expect(avatarArtFor(null)).toBe(avatarArt.fox);
    expect(avatarArtFor(undefined)).toBe(avatarArt.fox);
    expect(avatarArtFor('constructor')).toBe(avatarArt.fox);
  });

  it('kjent nøkkel gir sin egen tegning', () => {
    expect(avatarArtFor('elk')).toBe(avatarArt.elk);
    expect(avatarArtFor('fox')).toBe(avatarArt.fox);
  });

  it('ukjent nøkkel får de nøytrale fargene og et lesbart navn', () => {
    expect(personColorIn(themes.light, 'dragon')).toBe(themes.light.sharedColors);
    expect(personColorIn(themes.dark, 'dragon')).toBe(themes.dark.sharedColors);
    expect(avatarLabel('dragon')).toBe('Avatar');
  });
});
