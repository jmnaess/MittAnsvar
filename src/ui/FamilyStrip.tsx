import { useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Avatar, type AvatarPhotoSource } from './Avatar';
import { familyStripLayout, RING_EXTRA, shortName } from './familyStripLayout';
import { Text } from './Text';
import { colors, personColor, spacing } from './theme';

export type FamilyStripPerson = { id: string; name: string; avatar: string; photo?: AvatarPhotoSource };

type Props = {
  people: FamilyStripPerson[];
  /** Personen som vises alene, eller null for alle. */
  selectedId: string | null;
  /** Trykk på valgt person igjen gir null (vis alle). */
  onSelect: (id: string | null) => void;
};

/** Hvor bred falmingen mot høyre kant er når raden kan sveipes. */
const FADE_WIDTH = 48;

/**
 * Alle i husstanden øverst i «I dag». Trykk viser bare den personen, trykk igjen viser alle.
 * Opptil seks: alle på én rad, størrelsen regnes ut fra antall og skjermbredde (ring maks 56 px).
 * Sju eller flere: raden kan sveipes, og den falmer mot høyre til man er helt ute.
 */
export function FamilyStrip({ people, selectedId, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const layout = familyStripLayout(people.length, width - 2 * spacing.page);
  const [atEnd, setAtEnd] = useState(false);

  const cells = people.map((p) => (
    <Person
      key={p.id}
      person={p}
      ring={layout.ring}
      cellWidth={layout.cellWidth}
      selected={p.id === selectedId}
      dimmed={selectedId !== null && p.id !== selectedId}
      onPress={() => onSelect(p.id === selectedId ? null : p.id)}
    />
  ));

  if (!layout.scrolls) {
    return <View style={styles.row} accessibilityRole="tablist">{cells}</View>;
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    setAtEnd(contentOffset.x + layoutMeasurement.width >= contentSize.width - 1);
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {cells}
      </ScrollView>
      {!atEnd && <RightFade />}
    </View>
  );
}

type PersonProps = {
  person: FamilyStripPerson;
  ring: number;
  cellWidth: number;
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
};

function Person({ person, ring, cellWidth, selected, dimmed, onPress }: PersonProps) {
  const name = shortName(person.name);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={person.name}
      accessibilityHint={selected ? 'Vis alle' : `Vis bare oppgavene til ${name}`}
      style={[styles.person, { width: cellWidth }, dimmed && styles.dimmed]}
    >
      <Avatar avatar={person.avatar} photo={person.photo} size={ring - RING_EXTRA} ring={personColor(person.avatar).ring} />
      {/* «Leah» eller «John M.». Et langt navn kuttes rett av, uten «…». */}
      <Text
        variant="label"
        color={selected ? colors.text : colors.textMuted}
        numberOfLines={1}
        ellipsizeMode="clip"
        style={styles.name}
      >
        {name}
      </Text>
    </Pressable>
  );
}

/** Fra gjennomsiktig til sidens bakgrunn, så det synes at det finnes flere til høyre. */
function RightFade() {
  return (
    <View pointerEvents="none" style={styles.fade}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="familyStripFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#familyStripFade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: spacing.page },
  person: { alignItems: 'center', gap: 4 },
  dimmed: { opacity: 0.45 },
  name: { alignSelf: 'stretch', textAlign: 'center', paddingHorizontal: 2 },
  fade: { position: 'absolute', top: 0, right: 0, bottom: 0, width: FADE_WIDTH },
});
