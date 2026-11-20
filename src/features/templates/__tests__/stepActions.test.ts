import { addTitle, homeFormButtons, homeSuggestionButtons, routineButtons } from '../stepActions';

describe('«Legg til»', () => {
  it('med og uten antall', () => {
    expect(addTitle(3)).toBe('Legg til (3)');
    expect(addTitle(0)).toBe('Legg til');
  });
});

describe('hverdagen', () => {
  const base = { choiceCount: 5, isOnboarding: true, hasAdded: false };

  it('med valg: «Legg til (n)» og «Hopp over»', () => {
    expect(routineButtons({ ...base, selectedCount: 2 })).toEqual({
      primaryTitle: 'Legg til (2)',
      skipTitle: 'Hopp over',
    });
  });

  it('uten valg: som før', () => {
    expect(routineButtons({ ...base, selectedCount: 0 })).toEqual({
      primaryTitle: 'Legg til',
      skipTitle: 'Hopp over',
    });
  });

  it('«Fortsett» når noe alt er lagt til, «Ikke nå» i Innstillinger, «Ferdig» uten forslag', () => {
    expect(routineButtons({ ...base, selectedCount: 0, hasAdded: true }).skipTitle).toBe('Fortsett');
    expect(routineButtons({ ...base, selectedCount: 1, isOnboarding: false })).toEqual({
      primaryTitle: 'Legg til (1)',
      skipTitle: 'Ikke nå',
    });
    expect(routineButtons({ ...base, choiceCount: 0, selectedCount: 0 }).skipTitle).toBe('Ferdig');
  });
});

describe('om hjemmet, spørsmålene', () => {
  it('oppstart med endrede svar: «Lagre og vis forslag» og «Hopp over»', () => {
    expect(homeFormButtons({ isOnboarding: true, changed: true })).toEqual({
      primaryTitle: 'Lagre og vis forslag',
      skipTitle: 'Hopp over',
    });
  });

  it('oppstart uten endringer: «Vis forslag» som før', () => {
    expect(homeFormButtons({ isOnboarding: true, changed: false })).toEqual({
      primaryTitle: 'Vis forslag',
      skipTitle: 'Hopp over',
    });
  });

  it('Innstillinger: «Lagre», ingen hoppknapp', () => {
    expect(homeFormButtons({ isOnboarding: false, changed: true }).skipTitle).toBeNull();
    expect(homeFormButtons({ isOnboarding: false, changed: false }).primaryTitle).toBe('Lagre');
  });
});

describe('om hjemmet, forslag til årshjulet', () => {
  it('«Hopp over» i oppstarten, «Ikke nå» i Innstillinger', () => {
    expect(homeSuggestionButtons({ selectedCount: 4, isOnboarding: true })).toEqual({
      primaryTitle: 'Legg til (4)',
      skipTitle: 'Hopp over',
    });
    expect(homeSuggestionButtons({ selectedCount: 0, isOnboarding: false })).toEqual({
      primaryTitle: 'Legg til',
      skipTitle: 'Ikke nå',
    });
  });
});
