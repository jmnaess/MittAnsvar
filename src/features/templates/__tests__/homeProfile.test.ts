import type { HomeProfile } from '../../household/types';
import { meetsRequires } from '../requires';
import {
  activeTemplateIds,
  formatSuggestionWhen,
  groupSuggestions,
  suggestAfterProfileChange,
  suggestForHousehold,
  type SuggestionHousehold,
} from '../suggest';
import type { TaskTemplate } from '../types';

const unanswered: HomeProfile = {
  housing_type: 'house',
  has_garden: null,
  has_car: null,
  has_cabin: null,
  has_air_heat_pump: null,
  has_fireplace: null,
  has_balanced_ventilation: null,
  has_hydronic_heating: null,
  has_private_well: null,
  sewage_type: null,
};

const household = (profile: Partial<SuggestionHousehold> = {}): SuggestionHousehold => ({
  type: 'family',
  ...unanswered,
  ...profile,
});

const template = (id: string, overrides: Partial<TaskTemplate> = {}) =>
  ({
    id,
    title: id,
    month: 5,
    recurrence_unit: 'year',
    household_types: null,
    housing_types: null,
    requires: null,
    ...overrides,
  }) as TaskTemplate;

const ids = (templates: TaskTemplate[]) => templates.map((t) => t.id);

// Et lite utvalg som ligner det ekte innholdet.
const fridge = template('fridge');
const tyres = template('tyres', { requires: { has_car: true } });
const heatPump = template('heat-pump', { requires: { has_air_heat_pump: true } });
const septic = template('septic', { requires: { sewage_type: ['septic_tank', 'mini_treatment_plant'] } });
const miniPlant = template('mini-plant', { requires: { sewage_type: ['mini_treatment_plant'] } });
const mower = template('mower', { housing_types: ['townhouse', 'house'], requires: { has_garden: true } });
const cabin = template('cabin', { requires: { has_cabin: true } });
const all = [fridge, tyres, heatPump, septic, miniPlant, mower, cabin];

describe('meetsRequires', () => {
  it('ingen betingelse passer alltid', () => {
    expect(meetsRequires(null, unanswered)).toBe(true);
  });

  it('ja/nei må stemme nøyaktig, og ubesvart oppfyller ingenting', () => {
    expect(meetsRequires({ has_car: true }, { ...unanswered, has_car: true })).toBe(true);
    expect(meetsRequires({ has_car: true }, { ...unanswered, has_car: false })).toBe(false);
    expect(meetsRequires({ has_car: true }, unanswered)).toBe(false);
    expect(meetsRequires({ has_car: false }, unanswered)).toBe(false);
    expect(meetsRequires({ has_car: false }, { ...unanswered, has_car: false })).toBe(true);
  });

  it('avløp: svaret må være ett av de oppførte', () => {
    const req = { sewage_type: ['septic_tank', 'mini_treatment_plant'] };
    expect(meetsRequires(req, { ...unanswered, sewage_type: 'septic_tank' })).toBe(true);
    expect(meetsRequires(req, { ...unanswered, sewage_type: 'mini_treatment_plant' })).toBe(true);
    expect(meetsRequires(req, { ...unanswered, sewage_type: 'municipal' })).toBe(false);
    expect(meetsRequires(req, unanswered)).toBe(false);
  });

  it('alle nøkler må stemme', () => {
    const req = { has_garden: true, has_cabin: true };
    expect(meetsRequires(req, { ...unanswered, has_garden: true, has_cabin: true })).toBe(true);
    expect(meetsRequires(req, { ...unanswered, has_garden: true })).toBe(false);
  });

  it('ukjente nøkler og feil form regnes som ikke oppfylt', () => {
    expect(meetsRequires({ has_pool: true }, unanswered)).toBe(false);
    expect(meetsRequires({ sewage_type: 'septic_tank' }, { ...unanswered, sewage_type: 'septic_tank' })).toBe(false);
    expect(meetsRequires(['has_car'], { ...unanswered, has_car: true })).toBe(false);
  });
});

describe('suggestForHousehold med hjemprofil', () => {
  it('ubesvart profil gir bare maler uten betingelse', () => {
    expect(ids(suggestForHousehold(all, household()))).toEqual(['fridge']);
  });

  it('svarene gir riktige maler', () => {
    const h = household({ has_car: true, has_air_heat_pump: true, sewage_type: 'septic_tank' });
    expect(ids(suggestForHousehold(all, h))).toEqual(['fridge', 'tyres', 'heat-pump', 'septic']);
  });

  it('minirenseanlegg gir både slam- og minirenseoppgaven, kommunalt ingen', () => {
    expect(ids(suggestForHousehold(all, household({ sewage_type: 'mini_treatment_plant' }))))
      .toEqual(['fridge', 'septic', 'mini-plant']);
    expect(ids(suggestForHousehold(all, household({ sewage_type: 'municipal' })))).toEqual(['fridge']);
  });

  it('boligtype og betingelse må begge stemme', () => {
    expect(ids(suggestForHousehold(all, household({ has_garden: true })))).toEqual(['fridge', 'mower']);
    expect(ids(suggestForHousehold(all, household({ has_garden: true, housing_type: 'apartment' }))))
      .toEqual(['fridge']);
  });

  it('hytte kommer i tillegg til boligtypen', () => {
    expect(ids(suggestForHousehold(all, household({ housing_type: 'apartment', has_cabin: true }))))
      .toEqual(['fridge', 'cabin']);
  });
});

describe('suggestAfterProfileChange', () => {
  it('første gang: alle som passer, også uten betingelse', () => {
    const after = household({ has_car: true });
    expect(ids(suggestAfterProfileChange(all, null, after, new Set()))).toEqual(['fridge', 'tyres']);
  });

  it('første gang: aktive maler er ikke med', () => {
    const after = household({ has_car: true });
    expect(ids(suggestAfterProfileChange(all, null, after, new Set(['fridge'])))).toEqual(['tyres']);
  });

  it('ny runde: bare maler som passer nå og ikke passet før', () => {
    const before = household({ has_car: true });
    const after = household({ has_car: true, has_air_heat_pump: true });
    expect(ids(suggestAfterProfileChange(all, before, after, new Set()))).toEqual(['heat-pump']);
  });

  it('ny runde: en mal man valgte bort, kommer ikke tilbake når et annet svar endres', () => {
    // Første runde ga fridge + tyres. Brukeren la bare til tyres (fridge er valgt bort).
    const before = household({ has_car: true });
    const after = household({ has_car: true, has_garden: true });
    expect(ids(suggestAfterProfileChange(all, before, after, new Set(['tyres'])))).toEqual(['mower']);
  });

  it('ny runde uten endring gir ingen forslag', () => {
    const profile = household({ has_car: true, sewage_type: 'septic_tank' });
    expect(suggestAfterProfileChange(all, profile, profile, new Set())).toEqual([]);
  });

  it('ny runde: et svar som tas bort, gir ingen forslag (og ingenting slettes)', () => {
    const before = household({ has_car: true });
    const after = household({ has_car: false });
    expect(suggestAfterProfileChange(all, before, after, new Set(['tyres']))).toEqual([]);
  });

  it('nei → ja igjen foreslår malen på nytt hvis den ikke er aktiv', () => {
    const before = household({ has_car: false });
    const after = household({ has_car: true });
    expect(ids(suggestAfterProfileChange(all, before, after, new Set()))).toEqual(['tyres']);
    expect(suggestAfterProfileChange(all, before, after, new Set(['tyres']))).toEqual([]);
  });

  it('septiktank → minirenseanlegg foreslår bare minirenseoppgaven', () => {
    const before = household({ sewage_type: 'septic_tank' });
    const after = household({ sewage_type: 'mini_treatment_plant' });
    expect(ids(suggestAfterProfileChange(all, before, after, new Set(['septic'])))).toEqual(['mini-plant']);
  });

  it('ingen duplikater selv om malen finnes to ganger i listen', () => {
    const after = household({ has_car: true });
    expect(ids(suggestAfterProfileChange([tyres, tyres], null, after, new Set()))).toEqual(['tyres']);
  });
});

describe('intervallmaler', () => {
  const heatPumpFilter = template('heat-pump-filter', {
    recurrence_type: 'interval',
    recurrence_unit: 'week',
    recurrence_every: 8,
    month: null,
    requires: { has_air_heat_pump: true },
  });
  const withInterval = [...all, heatPumpFilter];

  it('vises ikke i årshjulet', () => {
    const h = household({ has_air_heat_pump: true });
    expect(ids(suggestForHousehold(withInterval, h))).toEqual(['fridge', 'heat-pump']);
  });

  it('foreslås fra hjemprofilen når betingelsen er oppfylt', () => {
    const after = household({ has_air_heat_pump: true });
    expect(ids(suggestAfterProfileChange(withInterval, null, after, new Set())))
      .toEqual(['fridge', 'heat-pump', 'heat-pump-filter']);
  });

  it('ny runde: bare når svaret er nytt, og ikke når den er aktiv', () => {
    const before = household({ has_car: true });
    const after = household({ has_car: true, has_air_heat_pump: true });
    expect(ids(suggestAfterProfileChange(withInterval, before, after, new Set())))
      .toEqual(['heat-pump', 'heat-pump-filter']);
    expect(ids(suggestAfterProfileChange(withInterval, after, after, new Set()))).toEqual([]);
    expect(ids(suggestAfterProfileChange(withInterval, before, after, new Set(['heat-pump-filter']))))
      .toEqual(['heat-pump']);
  });
});

describe('activeTemplateIds', () => {
  it('tar med maler som har en oppgave, ikke egne oppgaver', () => {
    expect(activeTemplateIds([{ template_id: 'a' }, { template_id: null }, { template_id: 'b' }]))
      .toEqual(new Set(['a', 'b']));
  });
});

describe('groupSuggestions og formatSuggestionWhen', () => {
  it('slår sammen maler med samme tittel og sorterer månedene', () => {
    const groups = groupSuggestions([
      template('outdoor-nov', { title: 'Sjekk utedelen', month: 11 }),
      template('tyres', { title: 'Bytt dekk', month: 4 }),
      template('outdoor-jan', { title: 'Sjekk utedelen', month: 1 }),
    ]);
    expect(groups).toEqual([
      {
        key: 'outdoor-nov',
        title: 'Sjekk utedelen',
        when: 'Januar og november · 2 ganger i året',
        templateIds: ['outdoor-nov', 'outdoor-jan'],
      },
      { key: 'tyres', title: 'Bytt dekk', when: 'April · hvert år', templateIds: ['tyres'] },
    ]);
  });

  it('intervallmaler får egen rad med «etter sist», også med samme tittel som en årsmal', () => {
    const groups = groupSuggestions([
      template('filter', { title: 'Rens filteret', recurrence_type: 'interval', recurrence_unit: 'week', recurrence_every: 8, month: null }),
      template('filter-year', { title: 'Rens filteret', month: 9 }),
    ]);
    expect(groups).toEqual([
      { key: 'filter', title: 'Rens filteret', when: '8 uker etter sist', templateIds: ['filter'] },
      { key: 'filter-year', title: 'Rens filteret', when: 'September · hvert år', templateIds: ['filter-year'] },
    ]);
  });

  it('viser når og hvor ofte', () => {
    expect(formatSuggestionWhen([10])).toBe('Oktober · hvert år');
    expect(formatSuggestionWhen([3, 9])).toBe('Mars og september · 2 ganger i året');
    expect(formatSuggestionWhen([1, 3, 9, 11])).toBe('Januar, mars, september og november · 4 ganger i året');
  });
});
