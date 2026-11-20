import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { RecentDoneCard } from '../../../src/features/completions/components/RecentDoneCard';
import { boardCards, type BoardCard } from '../../../src/features/display/board';
import { BoardCardView } from '../../../src/features/display/components/BoardCardView';
import { BoardSettingsSheet } from '../../../src/features/display/components/BoardSettingsSheet';
import { useFamilyBoard, useKeepAwakeSetting } from '../../../src/features/display/hooks';
import { boardColumnCount, distributeCards } from '../../../src/features/display/layout';
import { boardPersonView, focusedMember } from '../../../src/features/display/personView';
import type { BoardHowTo, FamilyBoard } from '../../../src/features/display/types';
import { useBoardActions } from '../../../src/features/display/useBoardActions';
import { useIdleReset } from '../../../src/features/display/useIdleReset';
import { CelebrationOverlay } from '../../../src/features/feedback/components/CelebrationOverlay';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { MemberPhotoUrlsContext, usePhotoUrls } from '../../../src/features/household/hooks';
import { memberPhoto, photoPathsToSign } from '../../../src/features/household/photo';
import { useHowToSheet } from '../../../src/features/tasks/components/HowToSheet';
import { UpcomingCard } from '../../../src/features/tasks/components/UpcomingCard';
import { howToForTask } from '../../../src/features/tasks/howTo';
import { formatWeekdayDate } from '../../../src/lib/dates';
import { useMidnightRefetch } from '../../../src/lib/useMidnightRefetch';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import {
  Button,
  FamilyStrip,
  IconButton,
  makeStyles,
  Message,
  PageHeader,
  spacing,
  useTheme,
} from '../../../src/ui';

/** Bryteren «Hold skjermen våken»: skjermen holdes våken så lenge denne er montert. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

/** Layouten viser denne ruten bare når tavla finnes. */
export default function FamilyBoardScreen() {
  const { data: board } = useFamilyBoard();
  return board ? <Board board={board} /> : null;
}

/**
 * Familieskjermen: «I dag» for hele husstanden, ett kort per person side om side.
 * Trykk på en oppgave krysser av. Barn får en feiring i fullskjerm, voksne et banner.
 * Ingen redigering, ingen godkjenning og ingen saldo.
 *
 * Familieraden øverst: trykk på en person viser personvisningen (personens kort i dag,
 * «Kommende» og «Gjort siste 3 dager»). Trykk igjen, «Vis alle», midnatt eller 2 minutter uten
 * berøring går tilbake til alle. «Kommende» og «Gjort» er bare visning: skjermen kan bare krysse
 * av det som står i «I dag». Beløp per oppgave vises, men ingen summer eller saldo.
 * Bruker hele bredden (ikke pageWidth), og kolonnene følger vinduet, så den virker både
 * stående, liggende og i delt skjerm.
 */
function Board({ board }: { board: FamilyBoard }) {
  const { colors, personColor } = useTheme();
  const styles = useStyles();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { refetch: refetchBoard, error: refreshError } = useFamilyBoard();
  const refetch = useCallback(() => refetchBoard(), [refetchBoard]);
  const pullToRefresh = usePullToRefresh(refetch);
  const day = useMidnightRefetch(refetch);
  const keepAwake = useKeepAwakeSetting();
  const actions = useBoardActions(board);
  const { data: photoUrls } = usePhotoUrls(board.household_id, photoPathsToSign(board.members));
  const urls = photoUrls ?? EMPTY_URLS;

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Malen kommer med fra get_family_board, så skjermen trenger ikke useTemplates.
  const { infoPress, sheet: howToSheet } = useHowToSheet();
  const infoPressFor = (task: Parameters<typeof howToForTask>[0] & BoardHowTo) =>
    infoPress(howToForTask(task, task.template));
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  /** Personen som vises alene (trykk i FamilyStrip), eller null for alle. */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // Ny dag: alt foldes inn, og skjermen viser alle igjen.
  useEffect(() => {
    setExpandedKeys(new Set());
    setFocusedId(null);
  }, [day]);

  // En person som er slettet fra husstanden, gir «Alle».
  const focused = focusedMember(board.members, focusedId);
  const showAll = useCallback(() => setFocusedId(null), []);
  const touch = useIdleReset(focused !== null, showAll);

  function toggleExpanded(key: string) {
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function renderCard(card: BoardCard) {
    return (
      <BoardCardView
        key={card.key}
        card={card}
        members={board.members}
        photoUrls={urls}
        userId={session?.user.id}
        busyIds={actions.busyIds}
        undoingId={actions.undoingId}
        expanded={expandedKeys.has(card.key)}
        onToggleExpanded={() => toggleExpanded(card.key)}
        onPress={actions.press}
        onUndo={actions.undoCompletion}
        infoPressFor={infoPressFor}
      />
    );
  }

  // Personvisning: personens kort, «Kommende» og «Gjort siste 3 dager» side om side når det er plass.
  function personCards(member: NonNullable<typeof focused>) {
    const view = boardPersonView(board, member.id);
    const ring = personColor(member.avatar).ring;
    const cards = view.sections.map(renderCard);
    cards.push(
      <UpcomingCard
        key="upcoming"
        upcoming={view.upcoming}
        showReward={member.role === 'child'}
        emptyText="Ingenting planlagt de neste to ukene."
        infoPressFor={infoPressFor}
      />,
    );
    if (view.recentDays.length > 0) {
      cards.push(<RecentDoneCard key="recent" days={view.recentDays} checkColor={ring} />);
    }
    return cards;
  }

  const cards = focused ? personCards(focused) : boardCards(board).map(renderCard);
  const columnCount = boardColumnCount(width);
  // Personvisningen har få kort: de får heller bredden enn å stå i smale kolonner.
  const columns = distributeCards(cards, focused ? Math.min(columnCount, cards.length) : columnCount);

  return (
    <MemberPhotoUrlsContext.Provider value={urls}>
      {keepAwake.enabled && <KeepAwake />}
      {/* onTouchStart fanger alle trykk og sveip uten å ta dem fra knappene under. */}
      <View
        onTouchStart={touch}
        style={[
          styles.flex,
          { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl {...pullToRefresh} tintColor={colors.primary} />}
        >
          <PageHeader
            overline={formatWeekdayDate(board.today)}
            title={board.household_name}
            right={
              <View style={styles.headerRight}>
                {focused && <Button variant="secondary" small title="Vis alle" onPress={showAll} />}
                <IconButton
                  icon="settings-outline"
                  variant="surface"
                  accessibilityLabel="Innstillinger for denne skjermen"
                  onPress={() => setSettingsOpen(true)}
                />
              </View>
            }
          />
          {board.members.length > 1 && (
            <FamilyStrip
              people={board.members.map((m) => ({
                id: m.id,
                name: m.display_name,
                avatar: m.avatar,
                photo: memberPhoto(m, urls),
              }))}
              selectedId={focused?.id ?? null}
              onSelect={setFocusedId}
            />
          )}
          <View style={styles.body}>
            {actions.error && <Message>{actions.error}</Message>}
            {refreshError && (
              <Message tone="muted">Får ikke kontakt. Viser det som sist ble hentet.</Message>
            )}
            <View style={styles.columns}>
              {columns.map((column, index) => (
                <View key={index} style={styles.column}>
                  {column}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <MemberPickerModal
          taskTitle={actions.picking?.task.title ?? null}
          members={actions.picking?.members ?? []}
          onPick={actions.pick}
          onClose={actions.cancelPick}
        />
        <BoardSettingsSheet
          visible={settingsOpen}
          keepAwake={keepAwake.enabled}
          onKeepAwakeChange={keepAwake.setEnabled}
          onClose={() => setSettingsOpen(false)}
        />
        {howToSheet}
        {actions.toast && (
          <FeedbackToast
            resetKey={actions.toast.completionId}
            title={actions.toast.title}
            message={actions.toast.message}
            reward={actions.toast.reward}
            undoing={actions.undoing}
            onUndo={actions.undoToast}
            onHide={actions.hideToast}
          />
        )}
        {actions.celebration && (
          <CelebrationOverlay
            celebration={actions.celebration.celebration}
            member={actions.celebration.member}
            showName
            onHide={actions.hideCelebration}
          />
        )}
      </View>
    </MemberPhotoUrlsContext.Provider>
  );
}

const EMPTY_URLS: Record<string, string> = {};

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { paddingBottom: 120, gap: spacing.section },
    body: { paddingHorizontal: spacing.page, gap: spacing.section },
    columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.section },
    column: { flex: 1, minWidth: 0, gap: spacing.section },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.row },
  }),
);
