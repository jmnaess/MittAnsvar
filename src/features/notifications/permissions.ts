import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { ensureReminderChannel } from './schedule';

/**
 * granted:      vi kan sende varsler
 * undetermined: vi kan spørre (systemdialogen vises)
 * blocked:      brukeren har sagt nei, og bare telefonens innstillinger kan endre det
 */
export type PermissionState = 'granted' | 'undetermined' | 'blocked';

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  const provisional = p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (p.granted || provisional) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'blocked';
}

export async function getPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Viser systemdialogen hvis det går. Ellers gis dagens status tilbake. */
export async function requestPermission(): Promise<PermissionState> {
  // Android 13+ viser dialogen først når det finnes en kanal.
  await ensureReminderChannel();
  return toState(await Notifications.requestPermissionsAsync());
}

export function openSystemSettings(): Promise<void> {
  return Linking.openSettings();
}
