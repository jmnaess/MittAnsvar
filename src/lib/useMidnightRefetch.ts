import { useEffect, useState } from 'react';
import { msUntilNextMidnight } from './dates';

/** Litt etter midnatt, så serverens dato (household_today) helt sikkert har skiftet. */
const MARGIN_MS = 5_000;

/**
 * Henter «I dag» på nytt ved midnatt, også når skjermen står åpen (f.eks. et felles nettbrett).
 * Serveren avgjør hva som er i dag. Appen trenger bare å spørre på nytt til riktig tid.
 * Returnerer en dagsteller som øker ved hver midnatt: bruk den til å nullstille lokal tilstand.
 */
export function useMidnightRefetch(refetch: () => unknown): number {
  const [day, setDay] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
      setDay((d) => d + 1); // ny render: datoen øverst regnes ut på nytt, og neste midnatt planlegges
    }, msUntilNextMidnight(new Date()) + MARGIN_MS);
    return () => clearTimeout(timer);
  }, [refetch, day]);
  return day;
}
