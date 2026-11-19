import type { ReactNode } from 'react';
import { Modal, type ModalProps, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { pageWidth, radius, spacing } from './theme';

type Props = {
  visible: boolean;
  /** Utelatt = ingen tittel (innholdet har sin egen). */
  title?: string;
  /** Trykk utenfor boksen og tilbakeknappen på Android. Utelatt = kan bare lukkes fra innholdet. */
  onClose?: () => void;
  children: ReactNode;
};

/** Uten denne vrir iOS en åpen Modal til stående, også når iPaden står liggende. */
const ALL_ORIENTATIONS: ModalProps['supportedOrientations'] = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
];

/** Boks midt på skjermen over en mørk bakgrunn. Til korte valg og bekreftelser. */
export function Sheet({ visible, title, onClose, children }: Props) {
  const styles = useStyles();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={ALL_ORIENTATIONS}
      onRequestClose={onClose ?? (() => {})}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        disabled={!onClose}
        accessibilityLabel={onClose ? 'Lukk' : undefined}
      >
        {/* Trykk inne i boksen skal ikke lukke den. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {title && <Text variant="sectionTitle" accessibilityRole="header">{title}</Text>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: spacing.page },
    sheet: {
      ...pageWidth,
      backgroundColor: colors.background,
      borderRadius: radius.section,
      padding: spacing.page,
      gap: 12,
      maxHeight: '85%',
    },
  }),
);
