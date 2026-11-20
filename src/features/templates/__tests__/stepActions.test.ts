import { addTitle, homeFormButtons, homeSuggestionButtons, routineButtons } from '../stepActions';

describe('«Legg til»', () => {
  it('med og uten antall', () => {
    expect(addTitle(3)).toBe('Legg til (3)');
    expect(addTitle(0)).toBe('Legg til');
  });
});

describe('hverdagen: «Hopp over» blir liten når noe er valgt', () => {
  const base = { choiceCount: 5, isOnboarding: true, hasAdded: false };

  it('med valg: «Legg til (n)» og liten «Hopp over»', () => {
    expect(routineButtons({ ...base, selectedCount: 2 })).toEqual({
      primaryTitle: 'Legg til (2)',
      skipTitle: 'Hopp over',
      skipSmall: true,
    });
  });

  it('uten valg: som før', () => {
    expect(routineButtons({ ...base, selectedCount: 0 })).toEqual({
      primaryTitle: 'Legg til',
      skipTitle: 'Hopp over',
      skipSmall: false,
    });
  });

  it('«Fortsett» når noe alt er lagt til, «Ikke nå» i Innstillinger, «Ferdig» uten forslag', () => {
    expect(routineButtons({ ...base, selectedCount: 0, hasAdded: true }).skipTitle).toBe('Fortsett');
    expect(routineButtons({ ...base, selectedCount: 1, isOnboarding: false })).toEqual({
      primaryTitle: 'Legg til (1)',
      skipTitle: 'Ikke nå',
      skipSmall: true,
    });
    expect(routineButtons({ ...base, choiceCount: 0, selectedCount: 0 }).skipTitle).toBe('Ferdig');
  });
});

describe('om hjemmet, spørsmålene', () => {
  it('oppstart med endrede svar: «Lagre og vis forslag» og liten «Hopp over»', () => {
    expect(homeFormButtons({ isOnboarding: true, changed: true })).toEqual({
      primaryTitle: 'Lagre og vis forslag',
      skipTitle: 'Hopp over',
      skipSmall: true,
    });
  });

  it('oppstart uten endringer: «Vis forslag» som før', () => {
    expect(homeFormButtons({ isOnboarding: true, changed: false })).toEqual({
      primaryTitle: 'Vis forslag',
      skipTitle: 'Hopp over',
      skipSmall: false,
    });
  });

  it('Innstillinger: «Lagre», ingen hoppknapp', () => {
    expect(homeFormButtons({ isOnboarding: false, changed: true }).skipTitle).toBeNull();
    expect(homeFormButtons({ isOnboarding: false, changed: false }).primaryTitle).toBe('Lagre');
  });
});

describe('om hjemmet, forslag til årshjulet', () => {
  it('«Hopp over» i oppstarten, «Ikke nå» i Innstillinger, liten når noe er valgt', () => {
    expect(homeSuggestionButtons({ selectedCount: 4, isOnboarding: true })).toEqual({
      primaryTitle: 'Legg til (4)',
      skipTitle: 'Hopp over',
      skipSmall: true,
    });
    expect(homeSuggestionButtons({ selectedCount: 0, isOnboarding: false })).toEqual({
      primaryTitle: 'Legg til',
      skipTitle: 'Ikke nå',
      skipSmall: false,
    });
  });
});
