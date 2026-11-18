import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { Text } from 'react-native';
import { fonts, typography, type Scheme, type ThemeColors } from './theme';

/** Felles utseende på navigasjonsheadere (fanene og modalene). */
export function headerOptions(colors: ThemeColors) {
  return {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
    headerTintColor: colors.primary,
  };
}

/** Modalene i app/(app)/_layout.tsx. headerShown slås på per skjerm. */
export function modalScreenOptions(colors: ThemeColors) {
  return {
    ...headerOptions(colors),
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  };
}

/**
 * Felles utseende for fanelinjen og headerne i begge tab-layoutene (voksen og barn):
 * fanelinje i surface med kant øverst, valgt fane i primary, de andre i textMuted.
 */
export function tabScreenOptions(colors: ThemeColors): BottomTabNavigationOptions {
  return {
    ...headerOptions(colors),
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
    tabBarLabel: ({ focused, color, children }) => (
      <Text style={[focused ? typography.tabSelected : typography.tab, { color }]}>{children}</Text>
    ),
    sceneStyle: { backgroundColor: colors.background },
  };
}

/**
 * Tema for React Navigation. Gir riktig bakgrunn bak skjermene under overganger, så det ikke
 * blinker hvitt i mørkt tema.
 */
export function navigationTheme(scheme: Scheme, colors: ThemeColors): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
}
