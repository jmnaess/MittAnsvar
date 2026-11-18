import { Button, Sheet } from '../../../ui';

type Props = {
  /** Oppgaven det gjelder. null = skjult. */
  taskTitle: string | null;
  onRemove: () => void;
  onReassign: () => void;
  onClose: () => void;
};

/** Voksen trykker på en utført rad i «I dag»: rette feil hele dagen. */
export function DoneActionsSheet({ taskTitle, onRemove, onReassign, onClose }: Props) {
  return (
    <Sheet visible={taskTitle !== null} title={taskTitle ?? undefined} onClose={onClose}>
      <Button variant="danger" title="Ikke gjort" onPress={onRemove} />
      <Button variant="secondary" title="Endre hvem som gjorde det" onPress={onReassign} />
      <Button variant="text" title="Avbryt" onPress={onClose} />
    </Sheet>
  );
}
