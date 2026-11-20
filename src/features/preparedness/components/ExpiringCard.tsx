import { router } from 'expo-router';
import { Card, ListRow, Text } from '../../../ui';
import { replaceTitle } from '../format';
import { usePreparedness } from '../hooks';

type Props = { today: string };

/**
 * «I dag» for voksne: varer i beredskapslageret som går ut innen fire uker, eller har gått ut.
 * Trykk åpner varen, der ny dato settes. Vises ikke når ingenting går ut.
 */
export function ExpiringCard({ today }: Props) {
  const { expiring } = usePreparedness();
  if (expiring.length === 0) return null;
  return (
    <Card>
      <Text variant="groupTitle" accessibilityRole="header">Beredskapslager</Text>
      {expiring.map((item) => (
        <ListRow
          key={item.key}
          title={replaceTitle(item, today)}
          muted
          onPress={() => router.push({ pathname: '/preparedness', params: { item: item.key } })}
        />
      ))}
    </Card>
  );
}
