import { Text as RNText, type TextProps } from 'react-native';
import { typography, type TypographyVariant } from './theme';
import { useTheme } from './ThemeProvider';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Tekst i designsystemet. Velg variant fra skalaen i theme.ts i stedet for egne fontstørrelser. */
export function Text({ variant = 'body', color, style, ...rest }: Props) {
  const { colors } = useTheme();
  return <RNText {...rest} style={[typography[variant], { color: color ?? colors.text }, style]} />;
}
