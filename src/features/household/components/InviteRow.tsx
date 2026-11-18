import { formatDateTime } from '../../../lib/dates';
import { Button, ListRow } from '../../../ui';

type Props = {
  createdByName: string | undefined;
  expiresAt: string;
  busy?: boolean;
  onRevoke: () => void;
};

/** En aktiv invitasjon. Koden kan ikke vises igjen, bare trekkes tilbake. */
export function InviteRow({ createdByName, expiresAt, busy, onRevoke }: Props) {
  return (
    <ListRow
      title={createdByName ? `Invitasjon fra ${createdByName}` : 'Invitasjon'}
      meta={`Gyldig til ${formatDateTime(expiresAt)}`}
      right={<Button variant="text" small title="Trekk tilbake" onPress={onRevoke} disabled={busy} />}
    />
  );
}
