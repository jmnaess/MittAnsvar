import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';

/** Ikonene fanene bruker. Hvert finnes i Ionicons både fylt og som omriss (`-outline`). */
type TabIconName = 'sunny' | 'list' | 'calendar' | 'home' | 'settings' | 'wallet';

/**
 * Ikon til en fane i bunnmenyen: fylt når fanen er valgt, omriss ellers.
 * Farge og størrelse kommer fra fanelinjen, så ikonet følger fargene der.
 *
 * Bruk: `<Tabs.Screen options={{ tabBarIcon: tabIcon('home') }} />`
 */
export function tabIcon(name: TabIconName) {
  return function TabBarIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    // Fanelinjen sender alltid en fargestreng (aktiv/inaktiv farge). Typen ColorValue er videre
    // (null og tall), og den godtar ikke Ionicons. Derfor snevres den inn her.
    return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color as string} />;
  };
}
