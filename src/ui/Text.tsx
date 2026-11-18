import { Text as RNText, type TextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from './theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Tekst i designsystemet. Velg variant fra skalaen i theme.ts i stedet for egne fontstørrelser. */
export function Text({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return <RNText {...rest} style={[typography[variant], { color }, style]} />;
}
