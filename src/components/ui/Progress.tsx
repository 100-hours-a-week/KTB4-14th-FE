import { colors } from '@/src/theme';
import { StyleSheet, View } from 'react-native';

export function Progress({ step }: { step: number }) {
  return (
    <View style={styles.progress}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.bar, n <= step ? styles.barOn : styles.barOff]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, marginBottom: 22 },
  bar: { flex: 1, height: 6, borderRadius: 99 },
  barOn: { backgroundColor: colors.navy },
  barOff: { backgroundColor: colors.line },
});
