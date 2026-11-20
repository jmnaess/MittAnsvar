import { Text } from './Text';
import { Toast } from './Toast';
import { useTheme } from './ThemeProvider';

type Props = {
  /** F.eks. «Slettet: Rense sluk». */
  message: string;
  onUndo: () => void;
  onHide: () => void;
  undoing?: boolean;
  /** Ny verdi starter nedtellingen på nytt (f.eks. når en ny rad slettes). */
  resetKey: string;
  /** Legg banneret over den flytende plussen (se Toast). */
  aboveFab?: boolean;
};

/** Banner nederst med en kort tekst og «Angre» i 5 sekunder. */
export function UndoToast({ message, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Toast {...rest} visibleMs={5000}>
      <Text color={colors.toastText} numberOfLines={2}>{message}</Text>
    </Toast>
  );
}
