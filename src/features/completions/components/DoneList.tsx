import { Chip, colors, TaskRow, Text } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import type { TodayCompletion } from '../api';
import { canUndo, doneByText } from '../doneToday';

/** Det voksne kan gjøre med en utført rad, hele dagen. */
export type AdultDoneActions = {
  /** Trykk på sirkelen: «Merke som ikke gjort?». */
  onRemove: (completion: TodayCompletion) => void;
  /** Trykk på raden: valg mellom «Ikke gjort» og «Endre hvem som gjorde det». */
  onOpen: (completion: TodayCompletion) => void;
};

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
  /** Id-en til avkrysningen som endres akkurat nå. */
  busyId?: string;
  /** Barn (og voksne uten adultActions): angre innen 10 minutter. */
  onUndo: (completion: TodayCompletion) => void;
  /** Satt for voksne: rette feil uten tidsgrense i stedet for angring. */
  adultActions?: AdultDoneActions;
};

/**
 * Det som er gjort i dag, nederst i et kort i «I dag»: gjennomstreket og dempet.
 * Voksne kan rette hele dagen (se adultActions). Barn kan angre egne avkrysninger innen
 * 10 minutter (se canUndo). Ellers skjer ingenting.
 */
export function DoneList({
  done, sectionKey, allDone, nameOf, checkColor, isAdult, userId, busyId, onUndo, adultActions,
}: Props) {
  if (done.length === 0) return null;
  const now = Date.now();
  const adult = isAdult ? adultActions : undefined;
  return (
    <>
      {allDone && (
        <Text variant="rowTitle" color={colors.textWarm}>Alt er gjort i dag!</Text>
      )}
      {done.map((c) => {
        const undoable = canUndo(c, { now, isAdult, userId });
        const doneBy = doneByText(c, sectionKey, nameOf);
        const label = `${c.title}, utført${doneBy ? `, ${doneBy.toLowerCase()}` : ''}`;
        const right =
          c.reward_nok !== null ? (
            <>
              {c.status === 'pending' && <Chip label="Venter" />}
              <Chip label={formatKroner(c.reward_nok)} tone="money" />
            </>
          ) : undefined;

        if (adult) {
          return (
            <TaskRow
              key={c.id}
              title={c.title}
              meta={doneBy}
              done
              checkColor={checkColor}
              disabled={busyId === c.id}
              onPress={() => adult.onOpen(c)}
              onCheckPress={() => adult.onRemove(c)}
              checkAccessibilityLabel={`Merk ${c.title} som ikke gjort`}
              accessibilityLabel={label}
              accessibilityHint="Trykk for å endre"
              right={right}
            />
          );
        }

        return (
          <TaskRow
            key={c.id}
            title={c.title}
            meta={doneBy}
            done
            checkColor={checkColor}
            disabled={!undoable || busyId === c.id}
            // Tiden sjekkes på nytt ved trykk, i tilfelle raden har stått lenge.
            onPress={() => canUndo(c, { now: Date.now(), isAdult, userId }) && onUndo(c)}
            accessibilityLabel={label}
            accessibilityHint={undoable ? 'Trykk for å angre' : undefined}
            right={right}
          />
        );
      })}
    </>
  );
}
