import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './Text';
import { colors, personColor, spacing } from './theme';

export type FamilyStripPerson = { id: string; name: string; avatar: string };

type Props = {
  people: FamilyStripPerson[];
  /** Personen som vises alene, eller null for alle. */
  selectedId: string | null;
  /** Trykk på valgt person igjen gir null (vis alle). */
  onSelect: (id: string | null) => void;
};

/** Alle i husstanden øverst i «I dag». Trykk viser bare den personen, trykk igjen viser alle. */
export function FamilyStrip({ people, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {people.map((p) => {
        const selected = p.id === selectedId;
        const dimmed = selectedId !== null && !selected;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(selected ? null : p.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={p.name}
            accessibilityHint={selected ? 'Vis alle' : `Vis bare oppgavene til ${p.name}`}
            style={[styles.person, dimmed && styles.dimmed]}
          >
            {/* Avatar 44 + 3 px luft + 3 px ring = 56 px. */}
            <Avatar avatar={p.avatar} size={44} ring={personColor(p.avatar).ring} />
            <Text
              variant="label"
              color={selected ? colors.text : colors.textMuted}
              numberOfLines={1}
              style={styles.name}
            >
              {p.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 14, paddingHorizontal: spacing.page },
  person: { alignItems: 'center', gap: 4, width: 64 },
  dimmed: { opacity: 0.45 },
  name: { maxWidth: 64 },
});
