import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function KakaoCallback() {
  const router = useRouter();
  const { loginWithKakaoCode } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    (async () => {
      const fromLink = Linking.parse(typeof window !== 'undefined' ? window.location.href : '').queryParams?.code;
      const code = params.code ?? (typeof fromLink === 'string' ? fromLink : undefined);
      if (!code) {
        router.replace('/login');
        return;
      }
      try {
        await loginWithKakaoCode(code);
        router.replace('/(tabs)');
      } catch {
        router.replace('/login');
      }
    })();
  }, [loginWithKakaoCode, params.code, router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>카카오 로그인 처리 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.cream },
  text: { color: colors.muted, fontWeight: '700' },
});
