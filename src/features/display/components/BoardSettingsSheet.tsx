import { Button, Sheet, Switch } from '../../../ui';
import { AppearanceSection } from '../../appearance/AppearanceSection';

type Props = {
  visible: boolean;
  keepAwake: boolean;
  onKeepAwakeChange: (value: boolean) => void;
  onClose: () => void;
};

/** Innstillinger som gjelder denne skjermen. Ingenting her påvirker husstanden. */
export function BoardSettingsSheet({ visible, keepAwake, onKeepAwakeChange, onClose }: Props) {
  return (
    <Sheet visible={visible} title="Denne skjermen" onClose={onClose}>
      <Switch
        label="Hold skjermen våken"
        accessibilityLabel="Hold skjermen våken"
        value={keepAwake}
        onValueChange={onKeepAwakeChange}
      />
      <AppearanceSection />
      <Button variant="text" title="Lukk" onPress={onClose} />
    </Sheet>
  );
}
