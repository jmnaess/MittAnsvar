import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { Text } from 'react-native';
import { colors, fonts, typography } from './theme';

/**
 * Felles utseende for fanelinjen og headerne i begge tab-layoutene (voksen og barn):
 * hvit fanelinje med kant øverst, valgt fane i primary, de andre i textMuted.
 */
export const tabScreenOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
  tabBarLabel: ({ focused, color, children }) => (
    <Text style={[focused ? typography.tabSelected : typography.tab, { color }]}>{children}</Text>
  ),
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  headerTintColor: colors.primary,
  sceneStyle: { backgroundColor: colors.background },
};
