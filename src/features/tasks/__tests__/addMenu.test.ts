import { tasksAddButton, todayAddMenu } from '../addMenu';

type HrefObject = { pathname: string; params?: Record<string, string> };

const pathOf = (href: unknown) => (typeof href === 'string' ? href : (href as HrefObject).pathname);
const paramsOf = (href: unknown) => (typeof href === 'string' ? {} : ((href as HrefObject).params ?? {}));

describe('todayAddMenu («I dag»)', () => {
  it('barn får ingen meny', () => {
    expect(todayAddMenu({ isAdult: false, memberId: 'm1' })).toEqual([]);
  });

  it('voksne får tre valg i fast rekkefølge, uten «Oppgave i dag»', () => {
    const items = todayAddMenu({ isAdult: true });
    expect(items.map((i) => i.label)).toEqual(['Ny oppgave', 'Ekstrajobb', 'Årshjul-oppgave']);
    expect(items.map((i) => pathOf(i.href))).toEqual(['/task/new', '/job/new', '/year-task/new']);
  });

  it('valgt person følger bare med til «Ny oppgave»', () => {
    const [task, job, year] = todayAddMenu({ isAdult: true, memberId: 'm1' });
    expect(paramsOf(task.href)).toEqual({ memberId: 'm1' });
    expect(paramsOf(job.href)).toEqual({});
    expect(paramsOf(year.href)).toEqual({});
  });

  it('uten valgt person og aldri from=tasks', () => {
    for (const memberId of [null, undefined]) {
      for (const item of todayAddMenu({ isAdult: true, memberId })) expect(paramsOf(item.href)).toEqual({});
    }
  });
});

describe('tasksAddButton («Oppgaver»)', () => {
  it('barn får ingen knapp, i noen av segmentene', () => {
    expect(tasksAddButton({ segment: 'everyday', isAdult: false })).toBeNull();
    expect(tasksAddButton({ segment: 'year', isAdult: false })).toBeNull();
  });

  it('Hverdag: «Ny oppgave» med personen fra filteret og from=tasks', () => {
    const button = tasksAddButton({ segment: 'everyday', isAdult: true, memberId: 'm1' })!;
    expect(button.label).toBe('Ny oppgave');
    expect(pathOf(button.href)).toBe('/task/new');
    expect(paramsOf(button.href)).toEqual({ memberId: 'm1', from: 'tasks' });
  });

  it('Hverdag uten person i filteret: bare from=tasks', () => {
    const button = tasksAddButton({ segment: 'everyday', isAdult: true, memberId: null })!;
    expect(paramsOf(button.href)).toEqual({ from: 'tasks' });
  });

  it('Årshjul: «Ny årshjul-oppgave», uten person', () => {
    const button = tasksAddButton({ segment: 'year', isAdult: true, memberId: 'm1' })!;
    expect(button.label).toBe('Ny årshjul-oppgave');
    expect(pathOf(button.href)).toBe('/year-task/new');
    expect(paramsOf(button.href)).toEqual({ from: 'tasks' });
  });
});
