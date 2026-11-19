import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { HomeProfile } from '../household/types';

// De faste kategoriene. Samme nøkler som check-constrainten på tasks.category
// (supabase/migrations/*_task_categories.sql). Rekkefølgen her er rekkefølgen i «Oppgaver».

export type CategoryKey =
  | 'kitchen'
  | 'tidying'
  | 'laundry'
  | 'outdoor'
  | 'car'
  | 'pets'
  | 'maintenance'
  | 'other';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Category = { key: CategoryKey; label: string; icon: IconName };

export const CATEGORIES: readonly Category[] = [
  { key: 'kitchen', label: 'Kjøkken', icon: 'restaurant-outline' },
  { key: 'tidying', label: 'Rydding og rom', icon: 'bed-outline' },
  { key: 'laundry', label: 'Klesvask', icon: 'shirt-outline' },
  { key: 'outdoor', label: 'Ute og hage', icon: 'leaf-outline' },
  { key: 'car', label: 'Bil', icon: 'car-outline' },
  { key: 'pets', label: 'Kjæledyr', icon: 'paw-outline' },
  { key: 'maintenance', label: 'Vedlikehold', icon: 'construct-outline' },
  { key: 'other', label: 'Annet', icon: 'ellipsis-horizontal-circle-outline' },
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

/** Kategorien til en verdi fra databasen. Ukjent (f.eks. fra en nyere versjon) = Annet. */
export function toCategory(raw: string | null | undefined): Category {
  return BY_KEY.get(raw as CategoryKey) ?? BY_KEY.get('other')!;
}

/**
 * Rekkefølgen i valglista i skjemaet. De relevante først (i fast rekkefølge), så de som er
 * mindre relevante for hjemmet, så Kjæledyr (hjemprofilen spør ikke om dyr) og til slutt Annet.
 * Ubesvart (null) i hjemprofilen regnes som nei.
 */
export function categoryOptions(profile: Pick<HomeProfile, 'housing_type' | 'has_car' | 'has_garden'> | null): Category[] {
  const lessRelevant = (key: CategoryKey) =>
    (key === 'car' && profile?.has_car !== true) ||
    (key === 'outdoor' && profile?.has_garden !== true && profile?.housing_type === 'apartment');
  const last: CategoryKey[] = ['pets', 'other'];
  const middle = CATEGORIES.filter((c) => !last.includes(c.key));
  return [
    ...middle.filter((c) => !lessRelevant(c.key)),
    ...middle.filter((c) => lessRelevant(c.key)),
    ...last.map((key) => BY_KEY.get(key)!),
  ];
}
