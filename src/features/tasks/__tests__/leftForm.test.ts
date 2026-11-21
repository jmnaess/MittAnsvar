import { markDeleted, markGone, takeLeftForm } from '../leftForm';

describe('leftForm', () => {
  beforeEach(() => {
    takeLeftForm();
  });

  it('er tom når ingenting er lagt igjen', () => {
    expect(takeLeftForm()).toBeNull();
  });

  it('henter og tømmer en sletting', () => {
    markDeleted({ id: 't1', title: 'Rense sluk' }, 5);
    expect(takeLeftForm()).toEqual({ kind: 'deleted', task: { id: 't1', title: 'Rense sluk' }, at: 5 });
    expect(takeLeftForm()).toBeNull();
  });

  it('siste beskjed vinner', () => {
    markDeleted({ id: 't1', title: 'Rense sluk' }, 1);
    markGone('Oppgaven er slettet', 2);
    expect(takeLeftForm()).toEqual({ kind: 'gone', message: 'Oppgaven er slettet', at: 2 });
  });
});
