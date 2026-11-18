import { Chip, colors, TaskRow, Text } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import type { TodayCompletion } from '../api';
import { canUndo, doneByText } from '../doneToday';

type Props = {
  done: TodayCompletion[];
  /** Seksjonen radene står i (medlems-id, «shared» eller barnets egen id), til «Gjort av …». */
  sectionKey: string;
  /** Ingen oppgaver igjen i seksjonen: vis «Alt er gjort i dag!» over det som er gjort. */
  allDone: boolean;
  nameOf: (memberId: string) => string | undefined;
  /** Fyllfarge på sjekkboksen: personens ring-farge. */
  checkColor: string;
  isAdult: boolean;
  userId: string | undefined;
  /** Id-en til avkrysningen som angres akkurat nå. */
  undoingId?: string;
  onUndo: (completion: TodayCompletion) => void;
};

/**
 * Det som er gjort i dag, nederst i et kort i «I dag»: gjennomstreket og dempet.
 * Trykk angrer, men bare innen 10 minutter (se canUndo). Ellers skjer ingenting.
 */
export function DoneList({
  done, sectionKey, allDone, nameOf, checkColor, isAdult, userId, undoingId, onUndo,
}: Props) {
  if (done.length === 0) return null;
  const now = Date.now();
  return (
    <>
      {allDone && (
        <Text variant="rowTitle" color={colors.textWarm}>Alt er gjort i dag!</Text>
      )}
      {done.map((c) => {
        const undoable = canUndo(c, { now, isAdult, userId });
        const doneBy = doneByText(c, sectionKey, nameOf);
        return (
          <TaskRow
            key={c.id}
            title={c.title}
            meta={doneBy}
            done
            checkColor={checkColor}
            disabled={!undoable || undoingId === c.id}
            // Tiden sjekkes på nytt ved trykk, i tilfelle raden har stått lenge.
            onPress={() => canUndo(c, { now: Date.now(), isAdult, userId }) && onUndo(c)}
            accessibilityLabel={`${c.title}, utført${doneBy ? `, ${doneBy.toLowerCase()}` : ''}`}
            accessibilityHint={undoable ? 'Trykk for å angre' : undefined}
            right={
              c.reward_nok !== null ? (
                <>
                  {c.status === 'pending' && <Chip label="Venter" />}
                  <Chip label={formatKroner(c.reward_nok)} tone="money" />
                </>
              ) : undefined
            }
          />
        );
      })}
    </>
  );
}
