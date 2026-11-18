import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { Text } from 'react-native';
import { colors, fonts, typography } from './theme';

/** Felles utseende på navigasjonsheadere (fanene og modalene). */
export const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  headerTintColor: colors.primary,
};

/** Modalene i app/(app)/_layout.tsx. headerShown slås på per skjerm. */
export const modalScreenOptions = {
  ...headerOptions,
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};

/**
 * Felles utseende for fanelinjen og headerne i begge tab-layoutene (voksen og barn):
 * hvit fanelinje med kant øverst, valgt fane i primary, de andre i textMuted.
 */
export const tabScreenOptions: BottomTabNavigationOptions = {
  ...headerOptions,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
  tabBarLabel: ({ focused, color, children }) => (
    <Text style={[focused ? typography.tabSelected : typography.tab, { color }]}>{children}</Text>
  ),
  sceneStyle: { backgroundColor: colors.background },
};
