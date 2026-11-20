import { addedByText } from '../addedBy';

const members = [
  { id: 'leah', role: 'child' as const, display_name: 'Leah' },
  { id: 'mor', role: 'adult' as const, display_name: 'Mor' },
];

describe('addedByText', () => {
  it('barnet la inn oppgaven selv: «Lagt inn av Leah»', () => {
    expect(addedByText('leah', members)).toBe('Lagt inn av Leah');
  });
  it('en voksen la den inn (også godkjente forslag): ingen markør', () => {
    expect(addedByText('mor', members)).toBeUndefined();
  });
  it('ukjent eller tom: ingen markør', () => {
    expect(addedByText('borte', members)).toBeUndefined();
    expect(addedByText(null, members)).toBeUndefined();
    expect(addedByText(undefined, members)).toBeUndefined();
  });
});
