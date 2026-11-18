import { useState } from 'react';
import { Alert } from 'react-native';
import { toNorwegianMessage } from '../../lib/errors';
import { deleteAccount, signOut } from './api';

/**
 * «Logg ut» og «Slett konto» med bekreftelse. Brukes i Innstillinger og på oppstartsskjermen
 * (der kan en bruker uten husstand havne, f.eks. hvis en sletting stoppet halvveis).
 * Etter utlogging eller sletting bytter rotlayouten til innloggingsskjermen av seg selv.
 */
export function useAccountActions() {
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, errorTitle: string) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(errorTitle, toNorwegianMessage(e));
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Logg ut?', 'Du må skrive inn en ny kode fra e-post for å logge inn igjen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logg ut', style: 'destructive', onPress: () => run(signOut, 'Kunne ikke logge ut') },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Slette kontoen?',
      'Kontoen og e-postadressen din slettes. Er du den eneste voksne i husstanden, ' +
        'slettes også hele husstanden med barneprofiler, oppgaver og historikk.\n\n' +
        'Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett konto',
          style: 'destructive',
          onPress: () => run(deleteAccount, 'Kunne ikke slette kontoen'),
        },
      ],
    );
  }

  return { busy, confirmSignOut, confirmDeleteAccount };
}
