import { taskReward } from '../reward';

describe('taskReward', () => {
  it('hverdagsoppgaver: som feltet (tom = ingen, ugyldig = undefined)', () => {
    expect(taskReward('20', { yearly: false })).toBe(20);
    expect(taskReward('', { yearly: false })).toBeNull();
    expect(taskReward('0', { yearly: false })).toBeUndefined();
  });

  it('årshjul-oppgaver har aldri lønn, og et ugyldig beløp stopper ikke lagringen', () => {
    expect(taskReward('20', { yearly: true })).toBeNull();
    expect(taskReward('0', { yearly: true })).toBeNull();
    expect(taskReward('', { yearly: true })).toBeNull();
  });
});
