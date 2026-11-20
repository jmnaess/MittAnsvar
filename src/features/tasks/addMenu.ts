// Hva plussen nede til høyre gjør. Bare voksne lager oppgaver, så barn får ingen pluss.
//   «I dag»:     en meny med Ny oppgave, Ekstrajobb og Årshjul-oppgave (todayAddMenu).
//   «Oppgaver»: en knapp med tekst uten meny, etter segmentet (tasksAddButton).

import type { Href } from 'expo-router';
import type { ChipIconName } from '../../ui';
import type { TaskSection } from './section';
import { FROM_TASKS } from './tasksSegment';

export type AddMenuKey = 'task' | 'job' | 'year';

export type AddMenuItem = {
  key: AddMenuKey;
  label: string;
  icon: ChipIconName;
  href: Href;
};

/**
 * Menyen på «I dag». Tom liste = ingen pluss. Valgt person i personvisningen forhåndsvelges i
 * «Ny oppgave». Uten from=tasks, så man blir stående på «I dag» etter lagring.
 */
export function todayAddMenu({ isAdult, memberId }: { isAdult: boolean; memberId?: string | null }): AddMenuItem[] {
  if (!isAdult) return [];
  return [
    {
      key: 'task',
      label: 'Ny oppgave',
      icon: 'add-circle-outline',
      href: { pathname: '/task/new', params: memberId ? { memberId } : {} },
    },
    { key: 'job', label: 'Ekstrajobb', icon: 'cash-outline', href: '/job/new' },
    { key: 'year', label: 'Årshjul-oppgave', icon: 'calendar-outline', href: '/year-task/new' },
  ];
}

export type AddButton = { label: string; href: Href };

/**
 * Knappen på «Oppgaver». null = ingen pluss. from=tasks, så «Oppgaver» viser oppgaven der den
 * havnet (tasksSegment.ts). Personen i filteret i Hverdag forhåndsvelges.
 */
export function tasksAddButton({
  segment,
  isAdult,
  memberId,
}: {
  segment: TaskSection;
  isAdult: boolean;
  memberId?: string | null;
}): AddButton | null {
  if (!isAdult) return null;
  if (segment === 'year') return { label: 'Ny årshjul-oppgave', href: { pathname: '/year-task/new', params: FROM_TASKS } };
  return {
    label: 'Ny oppgave',
    href: { pathname: '/task/new', params: { ...(memberId ? { memberId } : {}), ...FROM_TASKS } },
  };
}
