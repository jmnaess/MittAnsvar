import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors } from '../../../components/theme';
import type { Member } from '../types';

type Props = {
  member: Member;
  /** Ekstra linje, f.eks. «Opptjent: 25 kr» for barn. */
  extra?: string;
  /** Uten onPress vises raden bare (f.eks. voksne, som ikke kan redigeres her). */
  onPress?: () => void;
  /** Hva trykket gjør, for skjermleser. */
  accessibilityHint?: string;
};

function describe(member: Member): string {
  if (member.role === 'adult') return 'Voksen';
  return member.birth_year ? `Barn, født ${member.birth_year}` : 'Barn';
}

export function MemberRow({ member, extra, onPress, accessibilityHint = 'Endre eller slette' }: Props) {
  const content = (
    <View style={styles.row}>
      <Avatar avatar={member.avatar} />
      <View style={styles.text}>
        <Text style={styles.name}>{member.display_name}</Text>
        <Text style={styles.detail}>{describe(member)}</Text>
        {extra && <Text style={styles.extra}>{extra}</Text>}
      </View>
      {onPress && <Text style={styles.chevron}>›</Text>}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  extra: { fontSize: 14, color: colors.text },
  chevron: { fontSize: 24, color: colors.muted },
  pressed: { opacity: 0.6 },
});
