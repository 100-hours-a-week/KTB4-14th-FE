import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.mark}>
          <Text style={styles.logo}>AUDIGO</Text>
        </View>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    gap: 18,
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { color: colors.white, fontWeight: '900', letterSpacing: 0.6, fontSize: 13 },
});
