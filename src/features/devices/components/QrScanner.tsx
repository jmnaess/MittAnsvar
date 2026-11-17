import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../components/theme';
import { parseLinkCode } from '../linkCode';

type Props = {
  /** Kalles én gang når en gyldig kode er skannet. */
  onCode: (code: string) => void;
  /** Mens koden sjekkes, ignoreres nye skann. */
  paused: boolean;
};

/**
 * Kamera som leser QR-koden fra den voksnes mobil. expo-camera virker i Expo Go.
 * Spør om tillatelse først når barnet trykker, ikke med en gang skjermen åpnes.
 */
export function QrScanner({ onCode, paused }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  // Kameraet melder samme kode mange ganger i sekundet. Vi sender bare en ny kode videre.
  const lastCode = useRef<string | null>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          {permission.canAskAgain
            ? 'Appen trenger kameraet for å lese QR-koden.'
            : 'Kameraet er slått av for appen. Slå det på i innstillingene, eller tast inn koden under.'}
        </Text>
        {permission.canAskAgain ? (
          <Button title="Skann QR-kode" onPress={requestPermission} />
        ) : (
          <Button variant="outline" title="Åpne innstillinger" onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.cameraFrame}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          paused
            ? undefined
            : ({ data }) => {
                const code = parseLinkCode(data);
                if (!code || code === lastCode.current) return;
                lastCode.current = code;
                onCode(code);
              }
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: colors.selected },
  text: { fontSize: 15, color: colors.text },
  cameraFrame: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
});
