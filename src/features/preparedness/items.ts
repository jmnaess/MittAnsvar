import { addDays } from '../../lib/dates';
import type { Household, Member } from '../household/types';
import {
  CATALOG,
  GROUP_ORDER,
  type CatalogItem,
  type PreparednessGroup,
  type PreparednessHousehold,
} from './catalog';
import type { PreparednessRow, PreparednessStatus } from './types';

/** Så mange dager før holdbarhetsdatoen varen dukker opp i «I dag». */
export const EXPIRY_WARNING_DAYS = 28;

/** En vare slik den vises for husstanden: tekst og mengde er regnet ut, og svaret er lagt på. */
export type PreparednessItem = {
  key: string;
  group: PreparednessGroup;
  title: string;
  amount: string | null;
  info: string | null;
  sourceUrl: string;
  /** null = mangler. */
  status: PreparednessStatus | null;
  expiresOn: string | null;
};

/** Barn under 3 år etter fødselsår: året nå minus fødselsåret er høyst 2. Uten fødselsår teller ikke. */
export function isToddler(member: Pick<Member, 'role' | 'birth_year'>, year: number): boolean {
  return member.role === 'child' && member.birth_year !== null && year - member.birth_year <= 2;
}

export function preparednessHousehold(
  household: Pick<Household, 'has_fireplace'>,
  members: Pick<Member, 'role' | 'birth_year'>[],
  year: number,
): PreparednessHousehold {
  return {
    // Minst én, så mengdene aldri blir 0 mens medlemmene hentes.
    people: Math.max(1, members.length),
    toddlers: members.filter((m) => isToddler(m, year)).length,
    hasFireplace: household.has_fireplace,
  };
}

/** Varene som gjelder husstanden, i listens rekkefølge, med husstandens svar. */
export function applicableItems(
  h: PreparednessHousehold,
  rows: PreparednessRow[],
  catalog: CatalogItem[] = CATALOG,
): PreparednessItem[] {
  const byKey = new Map(rows.map((r) => [r.item_key, r]));
  return catalog
    .filter((c) => !c.appliesTo || c.appliesTo(h))
    .map((c) => {
      const row = byKey.get(c.key);
      return {
        key: c.key,
        group: c.group,
        title: typeof c.title === 'function' ? c.title(h) : c.title,
        amount: c.amount ? c.amount(h) : null,
        info: c.info ?? null,
        sourceUrl: c.sourceUrl,
        status: row?.status ?? null,
        expiresOn: row?.expires_on ?? null,
      };
    });
}

/** «X av Y på plass». «Trenger vi ikke» telles ikke. */
export function progress(items: PreparednessItem[]): { have: number; total: number } {
  const counted = items.filter((i) => i.status !== 'not_needed');
  return { have: counted.filter((i) => i.status === 'have').length, total: counted.length };
}

/**
 * Varer som snart går ut eller har gått ut: på plass, med holdbarhetsdato høyst
 * EXPIRY_WARNING_DAYS dager fram. Tidligste dato først.
 */
export function expiringItems(items: PreparednessItem[], today: string): PreparednessItem[] {
  const limit = addDays(today, EXPIRY_WARNING_DAYS);
  return items
    .filter((i) => i.status === 'have' && i.expiresOn !== null && i.expiresOn <= limit)
    .sort((a, b) => (a.expiresOn! < b.expiresOn! ? -1 : a.expiresOn! > b.expiresOn! ? 1 : 0));
}

/** Varene gruppert i fast rekkefølge. Tomme grupper er ikke med. */
export function groupItems(
  items: PreparednessItem[],
): { group: PreparednessGroup; items: PreparednessItem[] }[] {
  return GROUP_ORDER.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter(
    (g) => g.items.length > 0,
  );
}
