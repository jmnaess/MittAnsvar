// Innstillinger for familieskjermen. Gjelder bare denne enheten, så de ligger ikke i databasen.
import { secureStorage } from '../../lib/secureStorage';

const KEEP_AWAKE_KEY = 'display.keepAwake';

/** Standard er på: skjermen står vanligvis på kjøkkenbenken med lader. */
export async function loadKeepAwake(): Promise<boolean> {
  return (await secureStorage.getItem(KEEP_AWAKE_KEY)) !== '0';
}

export async function saveKeepAwake(enabled: boolean): Promise<void> {
  await secureStorage.setItem(KEEP_AWAKE_KEY, enabled ? '1' : '0');
}
