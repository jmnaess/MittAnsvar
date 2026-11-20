import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { Button, makeStyles, ProgressRing, radius, spacing, Text, useTheme } from '../../../ui';
import { MemberAvatar } from '../../household/components/MemberAvatar';
import type { Member } from '../../household/types';
import { greetingFor, heroState, noWidow, progressA11yLabel, todayProgressText } from '../heroCard';

type Props = {
  member: Member;
  /** Åpne og utførte i «Mine oppgaver i dag». */
  open: number;
  done: number;
  /** «Denne uka: 12 oppgaver gjort · 85 kr tjent», eller undefined (ingenting gjort ennå). */
  week?: string;
  /** Dagens setning (phraseForDate). */
  phrase: string;
  /** 5 år og yngre: stor ring og figur, lite tekst. */
  young: boolean;
  /** Timen på enhetens klokke, til hilsenen. */
  hour: number;
  /** Satt = «Legg inn» vises når det ikke er noen oppgaver (innstillingen er på). */
  onAdd?: () => void;
};

/**
 * Kortet øverst i barnets «I dag»: hilsen, framgangsring rundt figuren, uka og dagens setning.
 * Alt gjort: «Nå har du fri.» med en gul kant. Ingen poeng, streaks eller sammenligning.
 * Bare på barnets egen enhet (ikke familieskjermen eller de voksne).
 */
export function ChildHeroCard({ member, open, done, week, phrase, young, hour, onAdd }: Props) {
  const { personColor, colors } = useTheme();
  const styles = useStyles();
  const color = personColor(member.avatar);
  const state = heroState(open, done);
  const total = open + done;
  const progress = total === 0 ? 0 : done / total;

  // Kanten er alltid der (i tint når den ikke synes), så kortet ikke hopper når alt blir gjort.
  const cardColors = { backgroundColor: color.tint, borderColor: state === 'allDone' ? colors.sun : color.tint };
  const ring = (
    <View>
      <ProgressRing
        size={young ? 132 : 76}
        stroke={young ? 10 : 6}
        progress={progress}
        color={color.ring}
        trackColor={colors.surface}
        accessibilityLabel={total > 0 ? progressA11yLabel(open, done) : undefined}
        accessibilityValue={total > 0 ? { min: 0, max: total, now: done } : undefined}
      >
        <MemberAvatar member={member} size={young ? 100 : 56} />
      </ProgressRing>
      {state === 'allDone' && (
        <View style={[styles.badge, young && styles.badgeLarge]}>
          <Ionicons name="checkmark-circle" size={young ? 34 : 24} color={color.ring} />
        </View>
      )}
    </View>
  );

  const addButton =
    state === 'empty' && onAdd ? <Button title="Legg inn" variant="secondary" small onPress={onAdd} /> : null;

  if (young) {
    const text =
      state === 'allDone' ? 'Alt er gjort! 🎉' : state === 'empty' ? 'Ingen oppgaver i dag' : `${done} av ${total}`;
    return (
      <View style={[styles.card, styles.young, cardColors]}>
        <Text variant="personName" color={color.ink} accessibilityRole="header">
          {`Hei, ${member.display_name}!`}
        </Text>
        {ring}
        <Text variant={state === 'progress' ? 'screenTitle' : 'sectionTitle'} color={color.ink} style={styles.center}>
          {text}
        </Text>
        {addButton}
      </View>
    );
  }

  const title =
    state === 'allDone' ? 'Alt er gjort i dag! 🎉' : state === 'empty' ? 'Ingen oppgaver i dag.' : todayProgressText(open, done);
  const sub =
    state === 'allDone' ? 'Nå har du fri.' : state === 'empty' ? 'Ser du noe du kan hjelpe til med?' : undefined;

  return (
    <View style={[styles.card, cardColors]}>
      <Text variant="personName" color={color.ink} accessibilityRole="header">
        {greetingFor(hour, member.display_name)}
      </Text>
      <View style={styles.row}>
        {ring}
        <View style={styles.text}>
          <Text variant="sectionTitle" color={color.ink}>{title}</Text>
          {sub && <Text variant="body" color={color.ink}>{sub}</Text>}
          {week && <Text variant="meta" color={colors.textMuted}>{week}</Text>}
          {addButton && <View style={styles.button}>{addButton}</View>}
        </View>
      </View>
      <Text variant="body" color={color.ink}>{noWidow(phrase)}</Text>
    </View>
  );
}

const FESTIVE_BORDER = 2;

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.section,
      padding: spacing.card,
      gap: spacing.row,
      borderWidth: FESTIVE_BORDER,
    },
    young: { alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.card },
    text: { flex: 1, gap: 2 },
    button: { alignSelf: 'flex-start', marginTop: 6 },
    center: { textAlign: 'center' },
    badge: { position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.surface, borderRadius: radius.round },
    badgeLarge: { right: 2, bottom: 2 },
  }),
);
