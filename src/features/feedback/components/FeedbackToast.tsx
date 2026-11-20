import { Text, Toast, useTheme } from '../../../ui';

type Props = {
  /** Hva som ble gjort, f.eks. «Søppel». */
  title: string;
  /** Tilbakemeldingen fra serveren. null = ingen tekst passet, vis en standardtekst. */
  message: string | null;
  /** Lønn til et barn, f.eks. «+10 kr til Leah». */
  reward?: string;
  onUndo: () => void;
  onHide: () => void;
  undoing?: boolean;
  /** Ny verdi (f.eks. completion-id) starter nedtellingen på nytt. */
  resetKey: string;
};

/** Banner nederst etter avkrysning: tilbakemelding og «Angre» i 6 sekunder. Serveren tillater angring i 10 minutter. */
export function FeedbackToast({ title, message, reward, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Toast {...rest} visibleMs={6000}>
      <Text variant="meta" color={colors.toastMuted}>✓ {title}</Text>
      {reward && <Text variant="rowTitle" color={colors.toastAction}>{reward}</Text>}
      <Text color={colors.toastText}>{message ?? 'Godt gjort!'}</Text>
    </Toast>
  );
}
