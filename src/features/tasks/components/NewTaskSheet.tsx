import { router, type Href } from 'expo-router';
import { Button, Sheet, Text, useTheme } from '../../../ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** «Oppgave i dag» fra «I dag», «Oppgave» fra «Oppgaver». */
  taskLabel: string;
  /** Skjemaet for oppgaven: /task/today eller /task/new. */
  taskHref: Href;
};

/**
 * Pluss i «I dag» og «Ny oppgave» i «Oppgaver»: velg oppgave eller ekstrajobb.
 * Begge kan lages begge steder.
 */
export function NewTaskSheet({ visible, onClose, taskLabel, taskHref }: Props) {
  const { colors } = useTheme();

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  return (
    <Sheet visible={visible} title="Hva vil du lage?" onClose={onClose}>
      <Text variant="meta" color={colors.textMuted}>
        Oppgave: noe som er noens faste ansvar. Ekstrajobb: noe ekstra barna kan ta, gjerne med lønn.
      </Text>
      <Button title={taskLabel} onPress={() => go(taskHref)} />
      <Button variant="secondary" title="Ekstrajobb" onPress={() => go('/job/new')} />
      <Button variant="secondary" title="Avbryt" onPress={onClose} />
    </Sheet>
  );
}
