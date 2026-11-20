import type { TodayCompletion } from '../completions/api';
import { isSharedYearTask, JOBS_KEY, type TodaySection } from './groupToday';
import type { TodayTask } from './types';

export const MINE_KEY = 'mine';

/**
 * «I dag» på barnets egen enhet (steg 10a): bare det barnet kan krysse av.
 *
 * - «Mine oppgaver i dag»: oppgaver til barnet og felles oppgaver, også månedsoppgaver. Felles
 *   årshjul-oppgaver (isSharedYearTask) er for voksne og vises ikke. En årshjul-oppgave som står
 *   på barnet, vises.
 * - «Ekstrajobber»: jobber for alle barna eller for dette barnet.
 *
 * Barnet ser aldri en oppgave det ikke får lov til å krysse av i complete_task. complete_task
 * lar likevel barnet krysse av felles årshjul-oppgaver (kjent begrensning, docs/DATABASE.md).
 * Tomme seksjoner vises ikke.
 *
 * done: dagens avkrysninger. Barnet ser bare sine egne (RLS), og alle vises under «Mine oppgaver
 * i dag», også jobber barnet har tatt.
 */
export function childTodaySections(
  tasks: TodayTask[],
  meId: string,
  done: TodayCompletion[] = [],
): TodaySection[] {
  const isJob = (t: TodayTask) => t.recurrence_type === 'job';
  const mine = tasks.filter(
    (t) =>
      !isJob(t) &&
      (t.assigned_member_id === meId || (t.assigned_member_id === null && !isSharedYearTask(t))),
  );
  const jobs = tasks.filter((t) => {
    if (!isJob(t)) return false;
    const ids = t.job_member_ids ?? [];
    return ids.length === 0 || ids.includes(meId);
  });

  const sections: TodaySection[] = [
    {
      key: MINE_KEY,
      title: 'Mine oppgaver i dag',
      member: null,
      data: mine,
      done: done.filter((c) => c.completed_by_member_id === meId),
    },
    { key: JOBS_KEY, title: 'Ekstrajobber', member: null, data: jobs, done: [] },
  ];
  return sections.filter((s) => s.data.length > 0 || s.done.length > 0);
}
