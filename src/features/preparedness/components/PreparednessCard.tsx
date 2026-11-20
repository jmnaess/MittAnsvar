import { router } from 'expo-router';
import { ListRow } from '../../../ui';
import { summaryText } from '../format';
import { usePreparedness } from '../hooks';

/** Øverst i Årshjul: «Beredskapslager · 14 av 22 på plass · 1 går snart ut». Åpner skjermen. */
export function PreparednessCard() {
  const { progress, expiring, isPending } = usePreparedness();
  return (
    <ListRow
      title="Beredskapslager"
      meta={isPending ? undefined : summaryText(progress, expiring.length)}
      onPress={() => router.push('/preparedness')}
      accessibilityHint="Åpner beredskapslageret"
    />
  );
}
