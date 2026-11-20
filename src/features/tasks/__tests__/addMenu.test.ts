import { addMenuItems, type AddMenuTab } from '../addMenu';

const TABS: AddMenuTab[] = ['today', 'everyday', 'year'];

function paramsOf(href: unknown): Record<string, string> {
  return (href as { params: Record<string, string> }).params;
}

describe('addMenuItems', () => {
  it('barn får ingen meny, på noen fane', () => {
    for (const tab of TABS) expect(addMenuItems({ tab, isAdult: false, memberId: 'm1' })).toEqual([]);
  });

  it('voksne får de samme fire valgene i samme rekkefølge overalt', () => {
    for (const tab of TABS) {
      const items = addMenuItems({ tab, isAdult: true });
      expect(items.map((i) => i.key)).toEqual(['today', 'task', 'job', 'year']);
      expect(items.map((i) => i.label)).toEqual(['Oppgave i dag', 'Ny oppgave', 'Ekstrajobb', 'Årshjul-oppgave']);
      expect(items.map((i) => (i.href as { pathname: string }).pathname)).toEqual([
        '/task/today',
        '/task/new',
        '/job/new',
        '/year-task/new',
      ]);
    }
  });

  it('forhåndsvelger det som passer fanen, og bare ett', () => {
    const suggested = (tab: AddMenuTab) =>
      addMenuItems({ tab, isAdult: true }).filter((i) => i.suggested).map((i) => i.label);
    expect(suggested('today')).toEqual(['Oppgave i dag']);
    expect(suggested('everyday')).toEqual(['Ny oppgave']);
    expect(suggested('year')).toEqual(['Årshjul-oppgave']);
  });

  it('valgt person følger med til oppgaveskjemaene, ikke til jobb og årshjul', () => {
    const items = addMenuItems({ tab: 'everyday', isAdult: true, memberId: 'm1' });
    const byKey = Object.fromEntries(items.map((i) => [i.key, paramsOf(i.href)]));
    expect(byKey.today.memberId).toBe('m1');
    expect(byKey.task.memberId).toBe('m1');
    expect(byKey.job).not.toHaveProperty('memberId');
    expect(byKey.year).not.toHaveProperty('memberId');
  });

  it('uten valgt person sendes ingen memberId', () => {
    for (const memberId of [null, undefined]) {
      for (const item of addMenuItems({ tab: 'today', isAdult: true, memberId })) {
        expect(paramsOf(item.href)).not.toHaveProperty('memberId');
      }
    }
  });

  it('from=tasks bare fra «Oppgaver», aldri fra «I dag»', () => {
    for (const item of addMenuItems({ tab: 'today', isAdult: true })) {
      expect(paramsOf(item.href)).not.toHaveProperty('from');
    }
    for (const tab of ['everyday', 'year'] as const) {
      for (const item of addMenuItems({ tab, isAdult: true })) expect(paramsOf(item.href).from).toBe('tasks');
    }
  });
});
