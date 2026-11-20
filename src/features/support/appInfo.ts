import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { AppInfo } from './feedbackEmail';

const UNKNOWN = 'ukjent';

/** Versjon, bygg og OS for tilbakemeldings-e-posten. */
export function getAppInfo(): AppInfo {
  return {
    version: Constants.expoConfig?.version ?? UNKNOWN,
    build: getBuild(),
    platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS,
    osVersion: getOsVersion(),
  };
}

function getBuild(): string {
  // I Expo Go er byggnummeret Expo Go sitt, ikke vårt.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'Expo Go';
  return Application.nativeBuildVersion ?? UNKNOWN;
}

function getOsVersion(): string {
  if (Platform.OS === 'android') {
    // Platform.Version er API-nivået (f.eks. 35); Release er versjonen brukeren kjenner (f.eks. «15»).
    const release = (Platform.constants as { Release?: string }).Release;
    return release ? `${release} (API ${Platform.Version})` : `API ${Platform.Version}`;
  }
  return String(Platform.Version);
}
