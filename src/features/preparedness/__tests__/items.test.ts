import { CATALOG } from '../catalog';
import { expiryPhrase, formatExpiryDate, itemMeta, replaceTitle, summaryText } from '../format';
import {
  applicableItems,
  expiringItems,
  groupItems,
  isToddler,
  preparednessHousehold,
  progress,
} from '../items';
import type { PreparednessRow } from '../types';

const adult = { role: 'adult' as const, birth_year: null };
const child = (birth_year: number | null) => ({ role: 'child' as const, birth_year });
const row = (item_key: string, status: PreparednessRow['status'], expires_on: string | null = null) => ({
  household_id: 'h',
  item_key,
  status,
  expires_on,
});
const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe('katalogen', () => {
  it('har unike nøkler som databasen godtar', () => {
    const all = CATALOG.map((c) => c.key);
    expect(new Set(all).size).toBe(all.length);
    for (const key of all) expect(key).toMatch(/^[a-z_]{1,40}$/);
  });

  it('har DSB som kilde på alle varer', () => {
    for (const c of CATALOG) expect(c.sourceUrl).toMatch(/^https:\/\/www\.dsb\.no\//);
  });
});

describe('isToddler', () => {
  it('teller barn under 3 år etter fødselsår', () => {
    expect(isToddler(child(2026), 2026)).toBe(true);
    expect(isToddler(child(2024), 2026)).toBe(true);
    expect(isToddler(child(2023), 2026)).toBe(false);
    expect(isToddler(child(null), 2026)).toBe(false);
    expect(isToddler(adult, 2026)).toBe(false);
  });

  it('følger året ved årsskiftet', () => {
    expect(isToddler(child(2024), 2026)).toBe(true);
    expect(isToddler(child(2024), 2027)).toBe(false);
  });
});

describe('applicableItems', () => {
  it('regner vann og mat for én person', () => {
    const items = applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), []);
    expect(items.find((i) => i.key === 'water')?.amount).toBe('20 liter (rundt 20 liter per person)');
    expect(items.find((i) => i.key === 'food')?.amount).toBe('Til 1 person i en uke');
  });

  it('regner vann og mat for fire, med bleier og barnemat til småbarn', () => {
    const members = [adult, adult, child(2016), child(2025)];
    const items = applicableItems(preparednessHousehold({ has_fireplace: true }, members, 2026), []);
    expect(items.find((i) => i.key === 'water')?.amount).toBe('80 liter (rundt 20 liter per person)');
    expect(items.find((i) => i.key === 'food')?.amount).toBe('Til 4 personer i en uke');
    expect(items.find((i) => i.key === 'diapers')?.amount).toBe('Til 1 barn under 3 år i en uke');
    expect(items.find((i) => i.key === 'baby_food')?.amount).toBe('Til 1 barn under 3 år i en uke');
  });

  it('har 22 varer uten småbarn og 24 med', () => {
    expect(applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), [])).toHaveLength(22);
    expect(
      applicableItems(preparednessHousehold({ has_fireplace: null }, [adult, child(2025)], 2026), []),
    ).toHaveLength(24);
  });

  it('bruker peis-svaret: ved, ved hvis dere har, eller avtale om overnatting', () => {
    const titleOf = (has_fireplace: boolean | null) => {
      const items = applicableItems(preparednessHousehold({ has_fireplace }, [adult], 2026), []);
      return items.filter((i) => i.key === 'firewood' || i.key === 'sleepover').map((i) => i.title);
    };
    expect(titleOf(true)).toEqual(['Ved']);
    expect(titleOf(null)).toEqual(['Ved, hvis dere har vedovn eller peis']);
    expect(titleOf(false)).toEqual(['Avtale om overnatting']);
  });

  it('legger på husstandens svar, og mangler uten rad', () => {
    const items = applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), [
      row('water', 'have', '2027-03-01'),
    ]);
    expect(items.find((i) => i.key === 'water')).toMatchObject({ status: 'have', expiresOn: '2027-03-01' });
    expect(items.find((i) => i.key === 'food')).toMatchObject({ status: null, expiresOn: null });
  });

  it('teller aldri 0 personer mens medlemmene hentes', () => {
    expect(preparednessHousehold({ has_fireplace: null }, [], 2026).people).toBe(1);
  });
});

describe('progress', () => {
  const h = preparednessHousehold({ has_fireplace: null }, [adult], 2026);

  it('teller det som er på plass av det som trengs', () => {
    expect(progress(applicableItems(h, [row('water', 'have'), row('food', null)]))).toEqual({ have: 1, total: 22 });
  });

  it('tar «Trenger vi ikke» ut av totalen', () => {
    expect(progress(applicableItems(h, [row('water', 'have'), row('pet_food', 'not_needed')]))).toEqual({
      have: 1,
      total: 21,
    });
  });
});

describe('expiringItems', () => {
  const h = preparednessHousehold({ has_fireplace: null }, [adult], 2026);
  const today = '2026-11-20';
  const expiring = (rows: PreparednessRow[]) => keys(expiringItems(applicableItems(h, rows), today));

  it('tar med varer som går ut innen 28 dager, og passerte', () => {
    expect(expiring([row('water', 'have', '2026-12-18')])).toEqual(['water']); // 28 dager
    expect(expiring([row('water', 'have', '2026-12-19')])).toEqual([]); // 29 dager
    expect(expiring([row('water', 'have', today)])).toEqual(['water']); // 0 dager
    expect(expiring([row('water', 'have', '2026-10-01')])).toEqual(['water']); // passert
  });

  it('sorterer på dato og hopper over varer uten dato', () => {
    expect(
      expiring([row('water', 'have', '2026-12-10'), row('food', 'have', '2026-11-25'), row('bags', 'have')]),
    ).toEqual(['food', 'water']);
  });

  it('hopper over varer som ikke gjelder lenger', () => {
    // Bleier med dato, men ingen småbarn i husstanden.
    expect(expiring([row('diapers', 'have', '2026-11-25')])).toEqual([]);
  });
});

describe('tekstene', () => {
  const today = '2026-11-20';

  it('formaterer datoen, med år bare når det ikke er i år', () => {
    expect(formatExpiryDate('2026-12-01', today)).toBe('1. desember');
    expect(formatExpiryDate('2027-03-01', today)).toBe('1. mars 2027');
  });

  it('sier «går ut» og «gikk ut»', () => {
    expect(expiryPhrase('2026-12-01', today)).toBe('går ut 1. desember');
    expect(expiryPhrase(today, today)).toBe('går ut 20. november');
    expect(expiryPhrase('2026-11-19', today)).toBe('gikk ut 19. november');
  });

  it('lager raden i «I dag»', () => {
    const [food] = applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), [
      row('food', 'have', '2026-12-01'),
    ]).filter((i) => i.key === 'food');
    expect(replaceTitle(food, today)).toBe('Bytt ut: Mat som tåler lagring i romtemperatur (går ut 1. desember)');
    expect(itemMeta(food, today)).toEqual(['Til 1 person i en uke', 'Går ut 1. desember']);
  });

  it('viser «Trenger vi ikke» under varen', () => {
    const [pet] = applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), [
      row('pet_food', 'not_needed'),
    ]).filter((i) => i.key === 'pet_food');
    expect(itemMeta(pet, today)).toEqual(['Trenger vi ikke']);
  });

  it('lager kortet i Årshjul', () => {
    expect(summaryText({ have: 14, total: 22 }, 0)).toBe('14 av 22 på plass');
    expect(summaryText({ have: 9, total: 12 }, 1)).toBe('9 av 12 på plass · 1 går snart ut');
  });

  it('grupperer i fast rekkefølge', () => {
    const groups = groupItems(applicableItems(preparednessHousehold({ has_fireplace: null }, [adult], 2026), []));
    expect(groups.map((g) => g.group)).toEqual(['water_food', 'information', 'heat_light', 'health', 'hygiene', 'payment']);
  });
});
