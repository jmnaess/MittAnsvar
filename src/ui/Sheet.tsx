import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  type ModalProps,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { SHEET_MAX_SHARE, sheetFrame } from './sheetLayout';
import { pageWidth, radius, spacing } from './theme';

type Props = {
  visible: boolean;
  /** Utelatt = ingen tittel (innholdet har sin egen). */
  title?: string;
  /** Trykk utenfor boksen og tilbakeknappen på Android. Utelatt = kan bare lukkes fra innholdet. */
  onClose?: () => void;
  /**
   * Knappene nederst («Bruk», «Avbryt»). Satt: de står alltid synlige under innholdet, og
   * innholdet ruller når arket ikke får plass (små telefoner, tastaturet oppe). Bruk det i ark
   * med tekstfelt.
   */
  footer?: ReactNode;
  children: ReactNode;
};

/** Uten denne vrir iOS en åpen Modal til stående, også når iPaden står liggende. */
export const ALL_ORIENTATIONS: ModalProps['supportedOrientations'] = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
];

/** Luft mellom feltet som skrives i og kanten av det som ruller. */
const FOCUS_MARGIN = 12;

/**
 * Toppen av tastaturet (screenY), null når det er nede. iOS sier fra før det kommer (Will),
 * Android først når det er oppe (Did).
 */
function useKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setTop(e.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return top;
}

/**
 * Boks midt på skjermen over en mørk bakgrunn. Til korte valg og bekreftelser. Når tastaturet
 * kommer, flytter arket seg opp over det (sheetFrame). Med footer ruller innholdet, og feltet som
 * skrives i, rulles fram.
 */
export function Sheet({ visible, title, onClose, footer, children }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const keyboardTop = useKeyboardTop();
  const [height, setHeight] = useState(0);
  const frame = sheetFrame({
    height,
    keyboardTop,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    padding: spacing.page,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={ALL_ORIENTATIONS}
      onRequestClose={onClose ?? (() => {})}
    >
      <Pressable
        style={[styles.backdrop, { paddingTop: frame.paddingTop, paddingBottom: frame.paddingBottom }]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        onPress={onClose}
        disabled={!onClose}
        accessibilityLabel={onClose ? 'Lukk' : undefined}
      >
        {/* Trykk inne i boksen skal ikke lukke den. */}
        <Pressable style={[styles.sheet, { maxHeight: frame.maxHeight ?? `${SHEET_MAX_SHARE * 100}%` }]} onPress={() => {}}>
          {title && <Text variant="sectionTitle" accessibilityRole="header">{title}</Text>}
          {footer === undefined ? (
            children
          ) : (
            <>
              <ScrollingContent keyboardUp={keyboardTop !== null}>{children}</ScrollingContent>
              <View style={styles.footer}>{footer}</View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Innholdet over footer. Krymper når arket når maks høyde, så footer alltid synes. Blir det
 * mindre mens tastaturet er oppe, rulles feltet som skrives i, fram.
 */
function ScrollingContent({ keyboardUp, children }: { keyboardUp: boolean; children: ReactNode }) {
  const styles = useStyles();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const scrollY = useRef(0);

  function revealFocused(viewport: number) {
    const input = TextInput.State.currentlyFocusedInput();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(content, (_x, y, _w, h) => {
      const top = y - FOCUS_MARGIN;
      const bottom = y + h + FOCUS_MARGIN;
      if (top < scrollY.current) scrollRef.current?.scrollTo({ y: Math.max(0, top) });
      else if (bottom > scrollY.current + viewport) scrollRef.current?.scrollTo({ y: bottom - viewport });
    });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.content}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      onLayout={(e) => keyboardUp && revealFocused(e.nativeEvent.layout.height)}
    >
      <View ref={contentRef} style={styles.contentInner}>
        {children}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: 'center',
      paddingHorizontal: spacing.page,
    },
    sheet: {
      ...pageWidth,
      backgroundColor: colors.background,
      borderRadius: radius.section,
      padding: spacing.page,
      gap: 12,
    },
    // Krymper i stedet for å skyve footer ut av arket.
    content: { flexGrow: 0, flexShrink: 1 },
    contentInner: { gap: 12 },
    footer: { gap: 12 },
  }),
);
