import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, type AvatarPhotoSource } from './Avatar';
import { Text } from './Text';
import { radius, spacing, type PersonColor } from './theme';

type Props = {
  title: string;
  /** Personens farger (useTheme().personColor(avatar)), eller sharedColors for «Felles». */
  color: PersonColor;
  /** Avatarnøkkel. Utelatt for «Felles». */
  avatar?: string;
  /** Profilbilde i stedet for figuren. */
  photo?: AvatarPhotoSource;
  /** Kort tekst til høyre i overskriften, f.eks. «35 kr tjent». */
  right?: string;
  children: ReactNode;
};

/** Seksjon i personens farge: navn i ink-farge øverst, hvite rader under. */
export function SectionCard({ title, color, avatar, photo, right, children }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: color.tint }]}>
      <View style={styles.header}>
        {avatar && <Avatar avatar={avatar} photo={photo} size={32} />}
        <Text variant="personName" color={color.ink} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {right && <Text variant="label" color={color.ink}>{right}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.section, padding: spacing.card, gap: spacing.row },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  title: { flex: 1 },
});
