import { StyleSheet, Text, View } from 'react-native';

export default function HouseholdScreen() {
  return (
    <View style={styles.container}>
      <Text>Husstand</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
