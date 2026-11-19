import { CATEGORIES, categoryOptions, toCategory } from '../categories';

const keys = (list: { key: string }[]) => list.map((c) => c.key);

describe('toCategory', () => {
  it('kjent nøkkel gir kategorien', () => {
    expect(toCategory('car').label).toBe('Bil');
  });

  it('ukjent, gammel eller tom verdi gir Annet', () => {
    expect(toCategory('safety').key).toBe('other');
    expect(toCategory(null).key).toBe('other');
    expect(toCategory(undefined).key).toBe('other');
  });
});

describe('CATEGORIES', () => {
  it('har fast rekkefølge med Annet sist', () => {
    expect(keys([...CATEGORIES])).toEqual([
      'kitchen', 'tidying', 'laundry', 'outdoor', 'car', 'pets', 'maintenance', 'other',
    ]);
  });
});

describe('categoryOptions', () => {
  const house = { housing_type: 'house' as const, has_car: true, has_garden: true };

  it('hus med bil og hage: fast rekkefølge, Kjæledyr og Annet sist', () => {
    expect(keys(categoryOptions(house))).toEqual([
      'kitchen', 'tidying', 'laundry', 'outdoor', 'car', 'maintenance', 'pets', 'other',
    ]);
  });

  it('uten bil: Bil etter de relevante', () => {
    expect(keys(categoryOptions({ ...house, has_car: false }))).toEqual([
      'kitchen', 'tidying', 'laundry', 'outdoor', 'maintenance', 'car', 'pets', 'other',
    ]);
  });

  it('ubesvart bil regnes som nei', () => {
    expect(keys(categoryOptions({ ...house, has_car: null })).indexOf('car')).toBe(5);
  });

  it('leilighet uten hage: Ute og hage og Bil nederst', () => {
    expect(keys(categoryOptions({ housing_type: 'apartment', has_car: null, has_garden: null }))).toEqual([
      'kitchen', 'tidying', 'laundry', 'maintenance', 'outdoor', 'car', 'pets', 'other',
    ]);
  });

  it('hus uten hage beholder Ute og hage blant de relevante', () => {
    expect(keys(categoryOptions({ ...house, has_garden: false })).indexOf('outdoor')).toBe(3);
  });

  it('uten profil: alle kategorier, Annet sist', () => {
    const list = keys(categoryOptions(null));
    expect(list).toHaveLength(8);
    expect(list[7]).toBe('other');
  });
});
