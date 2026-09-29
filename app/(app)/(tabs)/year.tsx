import { StyleSheet, Text, View } from 'react-native';

export default function YearScreen() {
  return (
    <View style={styles.container}>
      <Text>Årshjul</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
