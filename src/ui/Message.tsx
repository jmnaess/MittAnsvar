import { Text } from './Text';
import type { ThemeColors } from './theme';
import { useTheme } from './ThemeProvider';

type Tone = 'error' | 'success' | 'muted';

function toneColor(colors: ThemeColors, tone: Tone): string {
  if (tone === 'error') return colors.danger;
  return tone === 'success' ? colors.primary : colors.textMuted;
}

/**
 * Kort melding i en skjerm: feil (rød), bekreftelse (primary) eller nøytral forklaring.
 * Feil og bekreftelser leses opp av skjermleser med en gang.
 */
export function Message({ tone = 'error', children }: { tone?: Tone; children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      variant={tone === 'muted' ? 'meta' : 'metaStrong'}
      color={toneColor(colors, tone)}
      accessibilityLiveRegion={tone === 'muted' ? undefined : 'polite'}
    >
      {children}
    </Text>
  );
}

/** Hjelpetekst rett under et skjemafelt. Rød når feltet er ugyldig. */
export function Hint({ error, children }: { error?: boolean; children: string }) {
  const { colors } = useTheme();
  return (
    <Text variant="hint" color={error ? colors.danger : colors.textMuted} style={{ marginTop: -8 }}>
      {children}
    </Text>
  );
}
