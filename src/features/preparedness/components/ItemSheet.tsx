import { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { addDays } from '../../../lib/dates';
import { Button, DateField, Hint, Sheet, Switch, Text, useTheme } from '../../../ui';
import type { PreparednessItem } from '../items';
import type { PreparednessStatus } from '../types';

type Props = {
  /** null = lukket. */
  item: PreparednessItem | null;
  today: string;
  /** false = bare lesing (barn). */
  canEdit: boolean;
  onChange: (item: PreparednessItem, status: PreparednessStatus | null, expiresOn: string | null) => void;
  onClose: () => void;
};

/** Hvor langt fram datoen foreslås når en holdbarhetsdato legges til. */
const DEFAULT_EXPIRY_DAYS = 365;

/**
 * Arket bak (i) på en vare: mengde, mer fra DSB, holdbarhetsdato og «Trenger vi ikke».
 * Endringer lagres med en gang. Holdbarhetsdato bare når varen er på plass.
 */
export function ItemSheet({ item, today, canEdit, onChange, onClose }: Props) {
  const { colors } = useTheme();
  // Beholder innholdet mens arket tones ut.
  const last = useRef<PreparednessItem | null>(null);
  if (item) last.current = item;
  const shown = item ?? last.current;

  return (
    <Sheet visible={!!item} title={shown?.title} onClose={onClose}>
      {shown && (
        <View style={styles.content}>
          {shown.amount && <Text variant="bodyStrong">{shown.amount}</Text>}
          {shown.info && <Text>{shown.info}</Text>}

          {canEdit && shown.status === 'have' && (
            shown.expiresOn ? (
              <View style={styles.block}>
                <DateField
                  label="Holdbar til"
                  value={shown.expiresOn}
                  onChange={(d) => onChange(shown, 'have', d)}
                />
                <Hint>Varen dukker opp i «I dag» fire uker før.</Hint>
                <Button
                  variant="text"
                  title="Fjern holdbarhetsdato"
                  onPress={() => onChange(shown, 'have', null)}
                />
              </View>
            ) : (
              <Button
                variant="secondary"
                title="Legg til holdbarhetsdato"
                onPress={() => onChange(shown, 'have', addDays(today, DEFAULT_EXPIRY_DAYS))}
              />
            )
          )}

          {canEdit && (
            <Switch
              label="Trenger vi ikke"
              accessibilityLabel="Trenger vi ikke"
              value={shown.status === 'not_needed'}
              onValueChange={(on) => onChange(shown, on ? 'not_needed' : null, null)}
            />
          )}

          <Text
            variant="meta"
            color={colors.primary}
            accessibilityRole="link"
            accessibilityHint="Åpner kilden i nettleseren"
            onPress={() => Linking.openURL(shown.sourceUrl)}
          >
            Kilde: DSB
          </Text>
        </View>
      )}
      <Button variant="text" title="Lukk" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  block: { gap: 8 },
});
