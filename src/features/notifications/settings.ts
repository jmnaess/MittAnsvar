// Påminnelser er per bruker og per enhet. Ingenting om dette lagres i databasen.
// Vi bruker secureStorage, som allerede finnes, i stedet for å legge til AsyncStorage.

import { secureStorage } from '../../lib/secureStorage';
import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from './types';

const settingsKey = (userId: string) => `reminders.${userId}`;
const promptKey = (userId: string) => `reminders.prompt.${userId}`;

export async function loadReminderSettings(userId: string): Promise<ReminderSettings> {
  const raw = await secureStorage.getItem(settingsKey(userId));
  if (!raw) return DEFAULT_REMINDER_SETTINGS;
  try {
    // Felt som mangler (f.eks. fra en eldre versjon), får standardverdien.
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(userId: string, settings: ReminderSettings): Promise<void> {
  await secureStorage.setItem(settingsKey(userId), JSON.stringify(settings));
}

/** Satt når husstanden er opprettet eller brukeren har blitt med. Da spør vi om varsler. */
export async function isReminderPromptPending(userId: string): Promise<boolean> {
  return (await secureStorage.getItem(promptKey(userId))) === '1';
}

export async function setReminderPromptPending(userId: string, pending: boolean): Promise<void> {
  if (pending) await secureStorage.setItem(promptKey(userId), '1');
  else await secureStorage.removeItem(promptKey(userId));
}
