const mockStore = new Map<string, string>();

jest.mock('../../../lib/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

// Ny modul i hver test, så tilstanden i minnet starter tom.
const load = () => require('../openGroups') as typeof import('../openGroups');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const saved = () => JSON.parse(mockStore.get('tasks.openGroups') ?? '[]') as string[];

beforeEach(() => {
  mockStore.clear();
  jest.resetModules();
});

it('en gruppe som åpnes før det lagrede er lest, skriver ikke over det lagrede', async () => {
  mockStore.set('tasks.openGroups', JSON.stringify(['category:kitchen']));
  const { openGroups } = load();
  openGroups(['category:car']);
  await flush();
  expect(saved().sort()).toEqual(['category:car', 'category:kitchen']);
});

it('toggleGroup åpner og lukker', async () => {
  const { toggleGroup } = load();
  toggleGroup('person:leah');
  await flush();
  expect(saved()).toEqual(['person:leah']);
  toggleGroup('person:leah');
  await flush();
  expect(saved()).toEqual([]);
});

it('ødelagt verdi gir alle lukket', async () => {
  mockStore.set('tasks.openGroups', '{ikke json');
  const { openGroups } = load();
  openGroups(['category:car']);
  await flush();
  expect(saved()).toEqual(['category:car']);
});
