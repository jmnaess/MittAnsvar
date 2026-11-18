// Midlertidig bro: de gamle fargenavnene peker til tokenene i src/ui/theme.ts, så skjermer som
// ikke er gått over til designsystemet ennå, får de nye fargene. Slettes i del 2 av designsteget.
import { colors as tokens } from '../ui/theme';

export const colors = {
  primary: tokens.primary,
  danger: tokens.danger,
  success: tokens.primary,
  text: tokens.text,
  muted: tokens.textMuted,
  border: tokens.borderStrong,
  selected: tokens.jobBg,
  background: tokens.background,
};
