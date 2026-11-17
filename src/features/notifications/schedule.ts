// Tynn adapter mot expo-notifications. Hva som skal sendes, bestemmes i plan.ts.
//
// Vi eier alle planlagte varsler i appen. Derfor kan vi fjerne alle og planlegge på nytt,
// i stedet for å holde rede på id-er. Det er enkelt og gir aldri doble varsler.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannedReminder } from './types';

const CHANNEL_ID = 'reminders';

/** Ruten varselet åpner. «I dag» er fanen index. */
export const REMINDER_URL = '/';

// Vis varselet også når appen er åpen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android krever en kanal. Brukeren kan slå den av og på i telefonens innstillinger. */
export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Påminnelser',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function replaceAll(planned: PlannedReminder[], now: Date): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (planned.length === 0) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await ensureReminderChannel();

  for (const reminder of planned) {
    const [year, month, day] = reminder.date.split('-').map(Number);
    const at = new Date(year, month - 1, day, reminder.hour, reminder.minute); // lokal tid
    if (at <= now) continue; // f.eks. dagens varsel kl. 07:30 når klokka er 09

    await Notifications.scheduleNotificationAsync({
      content: { body: reminder.body, data: { url: REMINDER_URL } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}

// Kallene settes i kø, så to planlegginger aldri går samtidig og blander varslene.
let queue: Promise<void> = Promise.resolve();

function enqueue(job: () => Promise<void>): Promise<void> {
  queue = queue.then(job).catch((e) => console.warn('Kunne ikke planlegge påminnelser', e));
  return queue;
}

/** Fjerner gamle planlagte varsler og planlegger de nye. */
export function rescheduleReminders(planned: PlannedReminder[]): Promise<void> {
  return enqueue(() => replaceAll(planned, new Date()));
}

/** Ved utlogging og når påminnelser slås av. */
export function clearReminders(): Promise<void> {
  return enqueue(() => Notifications.cancelAllScheduledNotificationsAsync());
}
