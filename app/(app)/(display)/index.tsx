import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { boardCards } from '../../../src/features/display/board';
import { BoardCardView } from '../../../src/features/display/components/BoardCardView';
import { BoardSettingsSheet } from '../../../src/features/display/components/BoardSettingsSheet';
import { useFamilyBoard, useKeepAwakeSetting } from '../../../src/features/display/hooks';
import { boardColumnCount, distributeCards } from '../../../src/features/display/layout';
import type { FamilyBoard } from '../../../src/features/display/types';
import { useBoardActions } from '../../../src/features/display/useBoardActions';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { MemberPhotoUrlsContext, usePhotoUrls } from '../../../src/features/household/hooks';
import { photoPathsToSign } from '../../../src/features/household/photo';
import { formatWeekdayDate } from '../../../src/lib/dates';
import { useMidnightRefetch } from '../../../src/lib/useMidnightRefetch';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import { IconButton, makeStyles, Message, PageHeader, spacing, useTheme } from '../../../src/ui';

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
 * Trykk på en oppgave krysser av. Ingen redigering, ingen godkjenning og ingen saldo.
 * Bruker hele bredden (ikke pageWidth), og kolonnene følger vinduet, så den virker både
 * stående, liggende og i delt skjerm.
 */
function Board({ board }: { board: FamilyBoard }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { refetch: refetchBoard, error: refreshError } = useFamilyBoard();
  const refetch = useCallback(() => refetchBoard(), [refetchBoard]);
  const pullToRefresh = usePullToRefresh(refetch);
  const day = useMidnightRefetch(refetch);
  const keepAwake = useKeepAwakeSetting();
  const actions = useBoardActions(board.members);
  const { data: photoUrls } = usePhotoUrls(board.household_id, photoPathsToSign(board.members));
  const urls = photoUrls ?? EMPTY_URLS;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setExpandedKeys(new Set()), [day]);

  function toggleExpanded(key: string) {
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  const columns = distributeCards(boardCards(board), boardColumnCount(width));

  return (
    <MemberPhotoUrlsContext.Provider value={urls}>
      {keepAwake.enabled && <KeepAwake />}
      <View
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
              <IconButton
                icon="settings-outline"
                variant="surface"
                accessibilityLabel="Innstillinger for denne skjermen"
                onPress={() => setSettingsOpen(true)}
              />
            }
          />
          <View style={styles.body}>
            {actions.error && <Message>{actions.error}</Message>}
            {refreshError && (
              <Message tone="muted">Får ikke kontakt. Viser det som sist ble hentet.</Message>
            )}
            <View style={styles.columns}>
              {columns.map((cards, index) => (
                <View key={index} style={styles.column}>
                  {cards.map((card) => (
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
                    />
                  ))}
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
  }),
);
