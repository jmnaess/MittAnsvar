import { Text } from './Text';
import { colors } from './theme';

type Tone = 'error' | 'success' | 'muted';

const toneColor: Record<Tone, string> = {
  error: colors.danger,
  success: colors.primary,
  muted: colors.textMuted,
};

/**
 * Kort melding i en skjerm: feil (rød), bekreftelse (primary) eller nøytral forklaring.
 * Feil og bekreftelser leses opp av skjermleser med en gang.
 */
export function Message({ tone = 'error', children }: { tone?: Tone; children: string }) {
  return (
    <Text
      variant={tone === 'muted' ? 'meta' : 'metaStrong'}
      color={toneColor[tone]}
      accessibilityLiveRegion={tone === 'muted' ? undefined : 'polite'}
    >
      {children}
    </Text>
  );
}

/** Hjelpetekst rett under et skjemafelt. Rød når feltet er ugyldig. */
export function Hint({ error, children }: { error?: boolean; children: string }) {
  return (
    <Text variant="hint" color={error ? colors.danger : colors.textMuted} style={{ marginTop: -8 }}>
      {children}
    </Text>
  );
}
