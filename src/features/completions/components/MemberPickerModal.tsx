import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { colors } from '../../../components/theme';
import type { Member } from '../../household/types';

type Props = {
  /** Oppgaven det gjelder. null = skjult. */
  taskTitle: string | null;
  members: Member[];
  /**
   * Satt: raden er valgt fra start, og «Kryss av» bekrefter (oppgaver med lønn).
   * Ikke satt: trykk på en person krysser av med en gang.
   */
  preselectedId?: string | null;
  /** Mitt medlem, så raden kan vises som «(meg)». */
  meId?: string;
  onPick: (member: Member) => void;
  onClose: () => void;
};

/** «Hvem gjorde det?» Ved langt trykk, ledige jobber og oppgaver med lønn i «I dag». */
export function MemberPickerModal({ taskTitle, members, preselectedId, meId, onPick, onClose }: Props) {
  const confirm = !!preselectedId;
  const [selectedId, setSelectedId] = useState(preselectedId ?? null);

  // Ny oppgave i velgeren: start med det forhåndsvalgte igjen.
  useEffect(() => setSelectedId(preselectedId ?? null), [preselectedId, taskTitle]);

  const selected = members.find((m) => m.id === selectedId);

  return (
    <Modal visible={taskTitle !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Lukk">
        {/* Trykk inne i boksen skal ikke lukke den. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Hvem gjorde «{taskTitle}»?</Text>
          {members.map((member) => {
            const isSelected = confirm && member.id === selectedId;
            return (
              <Pressable
                key={member.id}
                onPress={() => (confirm ? setSelectedId(member.id) : onPick(member))}
                style={({ pressed }) => [styles.row, isSelected && styles.selected, pressed && styles.pressed]}
                accessibilityRole={confirm ? 'radio' : 'button'}
                accessibilityState={confirm ? { selected: isSelected } : undefined}
              >
                <Avatar avatar={member.avatar} size={36} />
                <Text style={styles.name}>
                  {member.display_name}
                  {member.id === meId ? ' (meg)' : ''}
                </Text>
              </Pressable>
            );
          })}
          {confirm && (
            <Button
              title="Kryss av"
              onPress={() => selected && onPick(selected)}
              disabled={!selected}
            />
          )}
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Avbryt</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: colors.background, borderRadius: 12, padding: 20, gap: 4 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  selected: { backgroundColor: colors.selected },
  pressed: { opacity: 0.6 },
  name: { fontSize: 16, color: colors.text },
  cancel: { alignItems: 'center', paddingTop: 12 },
  cancelText: { fontSize: 16, color: colors.primary },
});
