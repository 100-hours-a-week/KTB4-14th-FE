import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function ComingSoon() {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>서비스 준비중입니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.cream,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
});
