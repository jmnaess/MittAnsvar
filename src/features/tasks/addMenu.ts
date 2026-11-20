// Menyen bak den flytende plussen (AddFab) på «I dag» og «Oppgaver». Samme fire valg i samme
// rekkefølge overalt, så man finner dem igjen. Valget som passer fanen er forhåndsvalgt (uthevet
// og får skjermleserfokus først). Bare voksne lager oppgaver, så barn får ingen meny (og ingen knapp).

import type { Href } from 'expo-router';
import type { ChipIconName } from '../../ui';
import { FROM_TASKS } from './tasksSegment';

/** Hvor menyen åpnes fra: «I dag», eller segmentet i «Oppgaver». */
export type AddMenuTab = 'today' | 'everyday' | 'year';

export type AddMenuContext = {
  tab: AddMenuTab;
  isAdult: boolean;
  /** Valgt person (personvisningen på «I dag», personfilteret i Hverdag). Forhåndsvelges i skjemaet. */
  memberId?: string | null;
};

export type AddMenuKey = 'today' | 'task' | 'job' | 'year';

export type AddMenuItem = {
  key: AddMenuKey;
  label: string;
  icon: ChipIconName;
  href: Href;
  suggested: boolean;
};

const SUGGESTED: Record<AddMenuTab, AddMenuKey> = {
  today: 'today',
  everyday: 'task',
  year: 'year',
};

/** Valgene i plussmenyen. Tom liste = ingen pluss. */
export function addMenuItems({ tab, isAdult, memberId }: AddMenuContext): AddMenuItem[] {
  if (!isAdult) return [];
  // Fra «Oppgaver» bytter skjemaene til segmentet der oppgaven havnet (tasksSegment.ts).
  // Fra «I dag» blir man stående der, så parameteren sendes ikke.
  const from = tab === 'today' ? {} : FROM_TASKS;
  const member = memberId ? { memberId } : {};
  const items: Omit<AddMenuItem, 'suggested'>[] = [
    { key: 'today', label: 'Oppgave i dag', icon: 'today-outline', href: { pathname: '/task/today', params: { ...member, ...from } } },
    { key: 'task', label: 'Ny oppgave', icon: 'repeat-outline', href: { pathname: '/task/new', params: { ...member, ...from } } },
    { key: 'job', label: 'Ekstrajobb', icon: 'cash-outline', href: { pathname: '/job/new', params: from } },
    { key: 'year', label: 'Årshjul-oppgave', icon: 'calendar-outline', href: { pathname: '/year-task/new', params: from } },
  ];
  return items.map((item) => ({ ...item, suggested: item.key === SUGGESTED[tab] }));
}
