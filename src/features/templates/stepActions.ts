// Knappene nederst i «Forslag til hverdagen» og «Om hjemmet». Ren logikk, så den kan testes.
// Regelen: «Hopp over» / «Ikke nå» lagrer aldri noe fra steget. Er noe valgt eller endret, er
// hovedknappen (fylt) det som lagrer. Hoppknappen er alltid en vanlig tekstknapp, lik «Tilbake».

export type StepButtons = {
  primaryTitle: string;
  /** null: ingen hoppknapp (lukk i headeren). */
  skipTitle: string | null;
};

/** «Legg til (3)», eller «Legg til» uten valg (da er knappen av). */
export function addTitle(selectedCount: number): string {
  return selectedCount > 0 ? `Legg til (${selectedCount})` : 'Legg til';
}

/**
 * Hverdagen. Uten nye forslag: bare «Ferdig». Oppstart: «Hopp over», eller «Fortsett» når noe alt
 * er lagt til. Innstillinger: «Ikke nå».
 */
export function routineButtons(o: {
  choiceCount: number;
  selectedCount: number;
  isOnboarding: boolean;
  hasAdded: boolean;
}): StepButtons {
  if (o.choiceCount === 0) return { primaryTitle: addTitle(0), skipTitle: 'Ferdig' };
  const skipTitle = !o.isOnboarding ? 'Ikke nå' : o.hasAdded ? 'Fortsett' : 'Hopp over';
  return { primaryTitle: addTitle(o.selectedCount), skipTitle };
}

/**
 * Om hjemmet, spørsmålene. Oppstart: «Lagre og vis forslag» når svar er endret, ellers «Vis forslag»
 * (lagrer ingenting). Innstillinger: «Lagre», og ingen hoppknapp.
 */
export function homeFormButtons(o: { isOnboarding: boolean; changed: boolean }): StepButtons {
  if (!o.isOnboarding) return { primaryTitle: 'Lagre', skipTitle: null };
  return {
    primaryTitle: o.changed ? 'Lagre og vis forslag' : 'Vis forslag',
    skipTitle: 'Hopp over',
  };
}

/** Om hjemmet, forslag til årshjulet. «Hopp over» i oppstarten, «Ikke nå» i Innstillinger. */
export function homeSuggestionButtons(o: { selectedCount: number; isOnboarding: boolean }): StepButtons {
  return {
    primaryTitle: addTitle(o.selectedCount),
    skipTitle: o.isOnboarding ? 'Hopp over' : 'Ikke nå',
  };
}
