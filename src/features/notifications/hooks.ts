import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, toIsoDate } from '../../lib/dates';
import { useTasks, useUpcomingOccurrences } from '../tasks/hooks';
import { isMonthTask } from '../tasks/recurrence';
import { getPermission, requestPermission, type PermissionState } from './permissions';
import { PLAN_DAYS, planReminders } from './plan';
import { clearReminders, REMINDER_URL, rescheduleReminders } from './schedule';
import {
  isReminderPromptPending,
  loadReminderSettings,
  saveReminderSettings,
  setReminderPromptPending,
} from './settings';
import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings, type ReminderTask } from './types';

export const reminderKeys = {
  settings: (userId: string) => ['reminderSettings', userId] as const,
  prompt: (userId: string) => ['reminderPrompt', userId] as const,
};

// ---------------------------------------------------------------------------
// Innstillinger og spørsmålet etter oppstart
// ---------------------------------------------------------------------------

export function useReminderSettings(userId: string) {
  return useQuery({
    queryKey: reminderKeys.settings(userId),
    queryFn: () => loadReminderSettings(userId),
    staleTime: Infinity, // endres bare her i appen
  });
}

/** Lagrer, og oppdaterer cachen med en gang, så bryteren ikke hopper tilbake. */
export function useSaveReminderSettings(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ReminderSettings) => saveReminderSettings(userId, settings),
    onMutate: (settings) => queryClient.setQueryData(reminderKeys.settings(userId), settings),
  });
}

/**
 * Slår på påminnelser: spør om tillatelse hvis det trengs, og lagrer bare hvis vi fikk den.
 * Gir tilbake tillatelsen, så skjermen kan forklare hvis brukeren har sagt nei.
 */
export function useEnableReminders(userId: string) {
  const queryClient = useQueryClient();
  const save = useSaveReminderSettings(userId);

  return async (): Promise<PermissionState> => {
    const current = await getPermission();
    const permission = current === 'granted' ? current : await requestPermission();
    if (permission === 'granted') {
      const settings =
        queryClient.getQueryData<ReminderSettings>(reminderKeys.settings(userId)) ??
        DEFAULT_REMINDER_SETTINGS;
      await save.mutateAsync({ ...settings, enabled: true });
    }
    return permission;
  };
}

/** Tillatelsen nå. Leses på nytt når appen kommer tilbake, f.eks. fra telefonens innstillinger. */
export function usePermission() {
  const tick = useForegroundTick();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    getPermission().then(setPermission);
  }, [tick]);
  return { permission, setPermission };
}

export function useReminderPromptPending(userId: string) {
  return useQuery({
    queryKey: reminderKeys.prompt(userId),
    queryFn: () => isReminderPromptPending(userId),
    staleTime: Infinity,
  });
}

export function useDismissReminderPrompt(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => setReminderPromptPending(userId, false),
    onMutate: () => queryClient.setQueryData(reminderKeys.prompt(userId), false),
  });
}

// ---------------------------------------------------------------------------
// Planlegging
// ---------------------------------------------------------------------------

/** Øker hver gang appen kommer i forgrunnen. */
function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);
  return tick;
}

/**
 * Planlegger påminnelsene på nytt når appen åpnes eller kommer i forgrunnen, når innstillingene
 * endres, og når oppgavene endres. Alle endringer på oppgaver invaliderer ['tasks', householdId],
 * og forekomstene ligger under den nøkkelen. Da hentes de på nytt, og effekten under kjører.
 */
export function useReminderSync(householdId: string, userId: string, myMemberId: string | null) {
  const tick = useForegroundTick();
  // Datoen kan ha skiftet siden sist appen var åpen.
  const today = useMemo(() => toIsoDate(new Date()), [tick]);
  const to = addDays(today, PLAN_DAYS - 1);

  const { data: settings } = useReminderSettings(userId);
  const enabled = !!settings?.enabled;
  const { data: tasks } = useTasks(householdId);
  const { data: occurrences } = useUpcomingOccurrences(householdId, today, to, enabled);

  useEffect(() => {
    if (!settings) return;
    if (!settings.enabled) {
      clearReminders();
      return;
    }
    if (!tasks || !occurrences) return;

    const reminderTasks: ReminderTask[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      next_due_on: t.next_due_on,
      assigned_member_id: t.assigned_member_id,
      is_month_task: isMonthTask(t),
    }));
    rescheduleReminders(
      planReminders({ today, tasks: reminderTasks, occurrences, settings, myMemberId }),
    );
  }, [settings, tasks, occurrences, today, myMemberId, tick]);
}

// ---------------------------------------------------------------------------
// Trykk på varselet
// ---------------------------------------------------------------------------

// Siste svar huskes av expo-notifications. Vi husker hvilke vi har håndtert, så samme trykk
// ikke sender brukeren til «I dag» igjen når fanene vises på nytt (f.eks. etter innlogging).
const handled = new Set<string>();

/** Trykk på en påminnelse åpner «I dag». Gjelder både når appen var lukket og når den var åpen. */
export function useOpenTodayOnTap() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = `${response.notification.request.identifier}@${response.notification.date}`;
    if (handled.has(id)) return;
    handled.add(id);

    const url = response.notification.request.content.data?.url;
    if (url === REMINDER_URL) router.navigate(REMINDER_URL);
  }, [response, router]);
}
