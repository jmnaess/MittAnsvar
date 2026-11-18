import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Button, colors, minTouch, personColor, radius, Sheet, Text } from '../../../ui';
import { MemberAvatar } from '../../household/components/MemberAvatar';
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
  /** Teksten på bekreft-knappen når preselectedId er satt. Standard «Kryss av». */
  confirmLabel?: string;
  onPick: (member: Member) => void;
  onClose: () => void;
};

/**
 * «Hvem gjorde det?» Ved langt trykk, ledige jobber og oppgaver med lønn i «I dag», og når en
 * voksen flytter en utført oppgave til en annen person.
 */
export function MemberPickerModal({
  taskTitle, members, preselectedId, meId, confirmLabel = 'Kryss av', onPick, onClose,
}: Props) {
  const confirm = !!preselectedId;
  const [selectedId, setSelectedId] = useState(preselectedId ?? null);

  // Ny oppgave i velgeren: start med det forhåndsvalgte igjen.
  useEffect(() => setSelectedId(preselectedId ?? null), [preselectedId, taskTitle]);

  const selected = members.find((m) => m.id === selectedId);

  return (
    <Sheet visible={taskTitle !== null} title={`Hvem gjorde «${taskTitle}»?`} onClose={onClose}>
      {members.map((member) => {
        const isSelected = confirm && member.id === selectedId;
        const color = personColor(member.avatar);
        return (
          <Pressable
            key={member.id}
            onPress={() => (confirm ? setSelectedId(member.id) : onPick(member))}
            style={({ pressed }) => [
              styles.row,
              isSelected && { backgroundColor: color.tint, borderColor: color.ring },
              pressed && styles.pressed,
            ]}
            accessibilityRole={confirm ? 'radio' : 'button'}
            accessibilityState={confirm ? { selected: isSelected } : undefined}
          >
            <MemberAvatar member={member} size={32} />
            <Text variant="rowTitle" color={isSelected ? color.ink : colors.text}>
              {member.display_name}
              {member.id === meId ? ' (meg)' : ''}
            </Text>
          </Pressable>
        );
      })}
      {confirm && (
        <Button title={confirmLabel} onPress={() => selected && onPick(selected)} disabled={!selected} />
      )}
      <Button variant="text" title="Avbryt" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: minTouch + 8,
    paddingHorizontal: 12,
    borderRadius: radius.row,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
});
