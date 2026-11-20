/**
 * Varelista i beredskapslageret, basert på DSBs råd om egenberedskap for én uke.
 * Tekstene følger DSBs ord. Mengder står bare der DSB oppgir dem (vann, legemidler) eller der
 * de følger av «en uke» og husstanden (mat, bleier, barnemat). Se docs/DATABASE.md §1.
 *
 * Databasen lagrer bare husstandens svar per nøkkel (preparedness_items), så nøklene må aldri
 * endres. Nye varer kan legges til her uten migrasjon.
 */

/** DSBs sider og brosjyrer (sjekket 20.11.2026). */
export const DSB_SOURCES = {
  /** «Sjekkliste for din egenberedskap» på nettsiden. */
  checklist: 'https://www.dsb.no/sikkerhverdag/egenberedskap/slik-bidrar-du-til-norges-beredskap/',
  /** «Vann i beredskap»: rundt 20 liter drikkevann per person. */
  water: 'https://www.dsb.no/sikkerhverdag/egenberedskap/vann-i-beredskap/',
  /** «Legemidler og førstehjelpsutstyr du bør ha hjemme». */
  medicines:
    'https://www.dsb.no/sikkerhverdag/egenberedskap/legemidler-og-forstehjelpsutstyr-du-bor-ha-hjemme/',
  /** Sjekklisten som PDF («Ekstra gassbeholder eller brennstoff»). */
  checklistPdf:
    'https://www.dsb.no/siteassets/sikkerhverdag/egenberedskap/sjekkliste-egenberedskap-a4-bokmal.pdf',
  /** Kortversjonen «Tips for å klare deg hjemme under en krise» («Lurt å ha hjemme»). */
  shortVersion:
    'https://www.dsb.no/siteassets/sikkerhverdag/egenberedskap/dsb_kortlest_bokmal_digital_enkeltsider-1.pdf',
} as const;

/** Lenken i infoteksten øverst på skjermen. */
export const DSB_HOME_URL = 'https://www.dsb.no/sikkerhverdag';

export type PreparednessGroup = 'water_food' | 'information' | 'heat_light' | 'health' | 'hygiene' | 'payment';

export const GROUP_TITLES: Record<PreparednessGroup, string> = {
  water_food: 'Vann og mat',
  information: 'Informasjon',
  heat_light: 'Varme og lys',
  health: 'Helse',
  hygiene: 'Hygiene',
  payment: 'Betaling',
};

export const GROUP_ORDER: PreparednessGroup[] = [
  'water_food',
  'information',
  'heat_light',
  'health',
  'hygiene',
  'payment',
];

/** Det utregningen trenger om husstanden. */
export type PreparednessHousehold = {
  /** Antall i husstanden (voksne og barn). */
  people: number;
  /** Barn under 3 år etter fødselsår. */
  toddlers: number;
  /** Hjemprofilen: peis eller vedovn. null = ikke svart. */
  hasFireplace: boolean | null;
};

export type CatalogItem = {
  key: string;
  group: PreparednessGroup;
  /** Tittelen i lista. Kan avhenge av husstanden (ved). */
  title: string | ((h: PreparednessHousehold) => string);
  /** Mengden for husstanden. Utelatt = DSB oppgir ingen mengde. */
  amount?: (h: PreparednessHousehold) => string;
  /** Mer fra DSB, vist i arket. */
  info?: string;
  /** Satt = varen gjelder bare noen husstander. */
  appliesTo?: (h: PreparednessHousehold) => boolean;
  sourceUrl: string;
};

const persons = (n: number) => `${n} ${n === 1 ? 'person' : 'personer'}`;
const toddlers = (n: number) => `${n} barn under 3 år`;

export const CATALOG: CatalogItem[] = [
  // Vann og mat
  {
    key: 'water',
    group: 'water_food',
    title: 'Rent drikkevann på kanner eller flasker',
    amount: (h) => `${20 * h.people} liter (rundt 20 liter per person)`,
    sourceUrl: DSB_SOURCES.water,
  },
  {
    key: 'food',
    group: 'water_food',
    title: 'Mat som tåler lagring i romtemperatur',
    amount: (h) => `Til ${persons(h.people)} i en uke`,
    info: 'Husk spesialmat hvis noen trenger det.',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'baby_food',
    group: 'water_food',
    title: 'Barnemat',
    amount: (h) => `Til ${toddlers(h.toddlers)} i en uke`,
    appliesTo: (h) => h.toddlers > 0,
    sourceUrl: DSB_SOURCES.shortVersion,
  },
  {
    key: 'cooking',
    group: 'water_food',
    title: 'Grill, kokeapparat eller stormkjøkken',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'fuel',
    group: 'water_food',
    title: 'Ekstra gassbeholder eller brennstoff',
    sourceUrl: DSB_SOURCES.checklistPdf,
  },
  {
    key: 'pet_food',
    group: 'water_food',
    title: 'Mat og vann til kjæledyr',
    info: 'Har dere ikke kjæledyr? Velg «Trenger vi ikke».',
    sourceUrl: DSB_SOURCES.checklist,
  },
  // Informasjon
  {
    key: 'dab_radio',
    group: 'information',
    title: 'DAB-radio som går på batterier, sveiv eller solceller',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'batteries',
    group: 'information',
    title: 'Batterier og ladet batteribank',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'phone_list',
    group: 'information',
    title: 'Liste på papir med viktige telefonnummer',
    info: 'For eksempel nødnummer, legevakt, veterinær, familie, venner og naboer.',
    sourceUrl: DSB_SOURCES.checklist,
  },
  // Varme og lys
  { key: 'warm_clothes', group: 'heat_light', title: 'Varme klær', sourceUrl: DSB_SOURCES.checklist },
  {
    key: 'blankets',
    group: 'heat_light',
    title: 'Pledd, dyner eller soveposer',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'matches_candles',
    group: 'heat_light',
    title: 'Fyrstikker og stearinlys',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'flashlight',
    group: 'heat_light',
    title: 'Lommelykt eller hodelykt',
    info: 'Som går på batterier, sveiv eller solceller.',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'firewood',
    group: 'heat_light',
    title: (h) => (h.hasFireplace ? 'Ved' : 'Ved, hvis dere har vedovn eller peis'),
    appliesTo: (h) => h.hasFireplace !== false,
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'sleepover',
    group: 'heat_light',
    title: 'Avtale om overnatting',
    info:
      'Hvis dere ikke har annen oppvarming. En gass- eller parafinovn som er beregnet for innendørs bruk, er et alternativ.',
    appliesTo: (h) => h.hasFireplace === false,
    sourceUrl: DSB_SOURCES.checklist,
  },
  // Helse
  {
    key: 'medicines',
    group: 'health',
    title: 'Legemidler for minst sju dager',
    info: 'Ekstra forsyning av legemidler og medisinsk utstyr dere bruker fast.',
    sourceUrl: DSB_SOURCES.medicines,
  },
  { key: 'first_aid', group: 'health', title: 'Førstehjelpsutstyr', sourceUrl: DSB_SOURCES.checklist },
  {
    key: 'iodine',
    group: 'health',
    title: 'Jodtabletter',
    info:
      'Gjelder barn og voksne under 40 år, gravide og ammende. Skal bare tas etter beskjed fra myndighetene.',
    sourceUrl: DSB_SOURCES.medicines,
  },
  // Hygiene
  { key: 'hand_sanitizer', group: 'hygiene', title: 'Håndsprit', sourceUrl: DSB_SOURCES.checklist },
  { key: 'wet_wipes', group: 'hygiene', title: 'Våtservietter', sourceUrl: DSB_SOURCES.checklist },
  { key: 'toilet_paper', group: 'hygiene', title: 'Ekstra dopapir', sourceUrl: DSB_SOURCES.shortVersion },
  { key: 'bags', group: 'hygiene', title: 'Poser', sourceUrl: DSB_SOURCES.shortVersion },
  {
    key: 'menstrual',
    group: 'hygiene',
    title: 'Menstruasjonsprodukter',
    sourceUrl: DSB_SOURCES.checklist,
  },
  {
    key: 'diapers',
    group: 'hygiene',
    title: 'Bleier',
    amount: (h) => `Til ${toddlers(h.toddlers)} i en uke`,
    appliesTo: (h) => h.toddlers > 0,
    sourceUrl: DSB_SOURCES.checklist,
  },
  // Betaling
  {
    key: 'cash_cards',
    group: 'payment',
    title: 'Litt kontanter og flere betalingskort',
    sourceUrl: DSB_SOURCES.checklist,
  },
];
