import { StyleSheet, View } from 'react-native';
import type { AvatarPhotoSource } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { Button } from './Button';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { radius, spacing } from './theme';
import { useTheme } from './ThemeProvider';
import { waitingText } from './waitingText';

type Props = {
  /** Én per barn som venter (unike), i rekkefølge. */
  people: { name: string; avatar: string; photo?: AvatarPhotoSource }[];
  /** Antall avkrysninger som venter. */
  count: number;
  /** Ferdig formatert sum, f.eks. «35 kr». */
  total: string;
  onOpen: () => void;
};

/** Gult banner i «I dag» når barn har krysset av med lønn og venter på godkjenning. */
export function ApprovalBanner({ people, count, total, onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.banner}>
      <AvatarStack people={people} size={32} />
      <View style={styles.text}>
        <Text variant="rowTitle">{waitingText(people.map((p) => p.name))}</Text>
        <Text variant="meta" color={colors.textWarm}>
          {count} til godkjenning · {total}
        </Text>
      </View>
      <Button title="Se" small onPress={onOpen} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.sunSoft,
      borderRadius: radius.card,
      padding: spacing.card,
    },
    text: { flex: 1, gap: 2 },
  }),
);
