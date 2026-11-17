import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors } from '../../../components/theme';
import type { Member } from '../../household/types';

type Props = {
  /** Oppgaven det gjelder. null = skjult. */
  taskTitle: string | null;
  members: Member[];
  onPick: (member: Member) => void;
  onClose: () => void;
};

/** «Hvem gjorde det?» Vises ved langt trykk i «I dag». */
export function MemberPickerModal({ taskTitle, members, onPick, onClose }: Props) {
  return (
    <Modal visible={taskTitle !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Lukk">
        {/* Trykk inne i boksen skal ikke lukke den. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Hvem gjorde «{taskTitle}»?</Text>
          {members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => onPick(member)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Avatar avatar={member.avatar} size={36} />
              <Text style={styles.name}>{member.display_name}</Text>
            </Pressable>
          ))}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pressed: { opacity: 0.6 },
  name: { fontSize: 16, color: colors.text },
  cancel: { alignItems: 'center', paddingTop: 12 },
  cancelText: { fontSize: 16, color: colors.primary },
});
