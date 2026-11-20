import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useMyHousehold, useMyMember } from '../../src/features/household/hooks';
import { DSB_HOME_URL, GROUP_TITLES } from '../../src/features/preparedness/catalog';
import { ItemSheet } from '../../src/features/preparedness/components/ItemSheet';
import { itemMeta, summaryText } from '../../src/features/preparedness/format';
import { usePreparedness, useSetPreparednessItem } from '../../src/features/preparedness/hooks';
import { groupItems, type PreparednessItem } from '../../src/features/preparedness/items';
import type { PreparednessStatus } from '../../src/features/preparedness/types';
import { toIsoDate } from '../../src/lib/dates';
import { toNorwegianMessage } from '../../src/lib/errors';
import { CheckRow, Message, ModalFormScreen, Section, spacing, Text, useTheme } from '../../src/ui';

/**
 * Årshjul → «Beredskapslager»: DSBs råd om egenberedskap for én uke, med mengder for husstanden.
 * Trykk på raden krysser av «har». (i) åpner varen: holdbarhetsdato og «Trenger vi ikke».
 * Voksne endrer. ?item=<nøkkel> åpner en vare med en gang (fra «Bytt ut» i «I dag»).
 */
export default function PreparednessScreen() {
  const { colors } = useTheme();
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const isAdult = useMyMember(household!.id)?.role === 'adult';
  const { householdId, items, progress, expiring, error } = usePreparedness();
  const save = useSetPreparednessItem(householdId);
  const { item: initialKey } = useLocalSearchParams<{ item?: string }>();
  const [openKey, setOpenKey] = useState<string | null>(initialKey ?? null);
  const today = toIsoDate(new Date());
  const openItem = items.find((i) => i.key === openKey) ?? null;

  function change(item: PreparednessItem, status: PreparednessStatus | null, expiresOn: string | null) {
    save.mutate({ household_id: householdId, item_key: item.key, status, expires_on: expiresOn });
  }

  function toggle(item: PreparednessItem) {
    // Av: datoen fjernes også (den gjelder bare varer som er på plass).
    if (item.status === 'have') change(item, null, null);
    else change(item, 'have', null);
  }

  return (
    <ModalFormScreen closeTitle="Lukk">
      <View style={styles.intro}>
        <Text variant="sectionTitle">{summaryText(progress, expiring.length)}</Text>
        <Text variant="meta" color={colors.textMuted}>
          Det dere trenger for å klare dere selv i en uke hvis strømmen, vannet eller mobilnettet
          blir borte. Basert på råd fra DSB.
        </Text>
        <Text
          variant="meta"
          color={colors.primary}
          accessibilityRole="link"
          accessibilityHint="Åpner DSBs råd i nettleseren"
          onPress={() => Linking.openURL(DSB_HOME_URL)}
        >
          Les mer på dsb.no/sikkerhverdag
        </Text>
        {!isAdult && <Message tone="muted">Bare voksne kan endre beredskapslageret.</Message>}
        {(error || save.error) && <Message>{toNorwegianMessage(save.error ?? error)}</Message>}
      </View>

      {groupItems(items).map(({ group, items: groupItemsList }) => (
        <Section key={group} title={GROUP_TITLES[group]}>
          {groupItemsList.map((item) => (
            <CheckRow
              key={item.key}
              title={item.title}
              meta={itemMeta(item, today).join(' · ') || undefined}
              checked={item.status === 'have'}
              onToggle={() => toggle(item)}
              disabled={!isAdult}
              onInfoPress={() => setOpenKey(item.key)}
              infoLabel={`Mer om ${item.title}`}
            />
          ))}
        </Section>
      ))}

      <ItemSheet
        item={openItem}
        today={today}
        canEdit={isAdult}
        onChange={change}
        onClose={() => setOpenKey(null)}
      />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 8, marginBottom: spacing.section },
});
