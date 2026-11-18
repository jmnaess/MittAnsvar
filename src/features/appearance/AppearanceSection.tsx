import { ChoiceChips, Section, useAppearance, type AppearancePreference } from '../../ui';

const OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Lys' },
  { value: 'dark', label: 'Mørk' },
];

/**
 * «Utseende» under Innstillinger, både for voksne og på barnets enhet.
 * Lagres på enheten (ikke i databasen), så hver telefon kan ha sitt eget valg.
 */
export function AppearanceSection() {
  const { preference, setPreference } = useAppearance();
  return (
    <Section
      title="Utseende"
      description="System følger telefonens innstilling. Gjelder bare denne enheten."
    >
      <ChoiceChips options={OPTIONS} value={preference} onChange={setPreference} />
    </Section>
  );
}
