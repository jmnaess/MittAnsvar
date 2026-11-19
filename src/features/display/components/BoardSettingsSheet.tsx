import { Alert } from 'react-native';
import { toNorwegianMessage } from '../../../lib/errors';
import { Button, Message, Sheet, Switch } from '../../../ui';
import { AppearanceSection } from '../../appearance/AppearanceSection';
import { useUnlinkThisDisplay } from '../hooks';

type Props = {
  visible: boolean;
  keepAwake: boolean;
  onKeepAwakeChange: (value: boolean) => void;
  onClose: () => void;
};

/**
 * Innstillinger som gjelder denne skjermen. Ingenting her påvirker husstanden.
 * «Koble fra denne skjermen» kobler bare fra denne enheten, og den må kobles til på nytt med en
 * kode fra en voksen.
 */
export function BoardSettingsSheet({ visible, keepAwake, onKeepAwakeChange, onClose }: Props) {
  const unlink = useUnlinkThisDisplay();

  function confirmUnlink() {
    Alert.alert('Koble fra denne skjermen?', 'Skjermen må kobles til på nytt med en kode fra en voksen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Koble fra', style: 'destructive', onPress: () => unlink.mutate() },
    ]);
  }

  return (
    <Sheet visible={visible} title="Denne skjermen" onClose={onClose}>
      <Switch
        label="Hold skjermen våken"
        accessibilityLabel="Hold skjermen våken"
        value={keepAwake}
        onValueChange={onKeepAwakeChange}
      />
      <AppearanceSection />
      <Button
        variant="danger"
        title="Koble fra denne skjermen"
        onPress={confirmUnlink}
        disabled={unlink.isPending}
      />
      {unlink.error && <Message>{toNorwegianMessage(unlink.error)}</Message>}
      <Button variant="text" title="Lukk" onPress={onClose} />
    </Sheet>
  );
}
