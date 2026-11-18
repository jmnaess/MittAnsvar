import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { secureStorage } from '../lib/secureStorage';
import { APPEARANCE_STORAGE_KEY, parsePreference, resolveScheme, type AppearancePreference } from './appearance';
import { personColorIn, themes, type PersonColor, type Scheme, type Theme } from './theme';

export type { AppearancePreference };

type ThemeContextValue = {
  scheme: Scheme;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Leser valget fra enheten og viser ingenting før det er lest (ellers blinker appen lys → mørk).
 * Appearance.setColorScheme gjør at også det native følger valget: tastatur, Alert og datovelger.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference | null>(null);
  const system = useColorScheme();

  useEffect(() => {
    secureStorage
      .getItem(APPEARANCE_STORAGE_KEY)
      .catch(() => null)
      .then((raw) => setPreferenceState(parsePreference(raw)));
  }, []);

  useEffect(() => {
    if (preference) Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    secureStorage.setItem(APPEARANCE_STORAGE_KEY, next).catch(() => {
      // Valget gjelder likevel til appen startes på nytt.
    });
  }, []);

  if (!preference) return null;

  const value = { scheme: resolveScheme(preference, system), preference, setPreference };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme må brukes inne i <ThemeProvider>');
  return ctx;
}

export type ThemeValue = Theme & { personColor: (avatarKey: string | null | undefined) => PersonColor };

// Ett ferdig objekt per tema, så komponentene får samme objekt hver gang.
const values: Record<Scheme, ThemeValue> = {
  light: { ...themes.light, personColor: (key) => personColorIn(themes.light, key) },
  dark: { ...themes.dark, personColor: (key) => personColorIn(themes.dark, key) },
};

/** Fargene, skyggen og personfargene for temaet som vises nå. */
export function useTheme(): ThemeValue {
  return values[useThemeContext().scheme];
}

/** Valget under «Utseende». */
export function useAppearance() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}
