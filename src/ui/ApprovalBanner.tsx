import { StyleSheet, View } from 'react-native';
import type { AvatarPhotoSource } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { Button } from './Button';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { radius, spacing } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  /** Én per barn som venter (unike), i rekkefølge. */
  people: { name: string; avatar: string; photo?: AvatarPhotoSource }[];
  /** «Leah venter» / «Leah har et forslag». */
  title: string;
  /** «2 til godkjenning · 35 kr · 1 forslag». */
  meta: string;
  onOpen: () => void;
};

/**
 * Gult banner i «I dag» når barn venter på en voksen: avkrysninger med lønn og forslag.
 * Teksten regnes ut av den som bruker banneret (approvalBannerText i features/proposals).
 */
export function ApprovalBanner({ people, title, meta, onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.banner}>
      <AvatarStack people={people} size={32} />
      <View style={styles.text}>
        <Text variant="rowTitle">{title}</Text>
        <Text variant="meta" color={colors.textWarm}>
          {meta}
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
