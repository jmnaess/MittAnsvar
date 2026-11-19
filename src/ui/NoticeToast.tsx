import { Text } from './Text';
import { Toast } from './Toast';
import { useTheme } from './ThemeProvider';

type Props = {
  /** F.eks. «Lagt i Årshjul». */
  message: string;
  onHide: () => void;
  /** Ny verdi starter nedtellingen på nytt. */
  resetKey: string;
};

/** Banner nederst med en kort melding i 3 sekunder, uten «Angre». */
export function NoticeToast({ message, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Toast {...rest} visibleMs={3000}>
      <Text color={colors.toastText} numberOfLines={2}>{message}</Text>
    </Toast>
  );
}
