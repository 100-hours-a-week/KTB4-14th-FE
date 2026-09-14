import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { colors, radius } from '@/src/theme';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithKakaoCode } = useAuth();
  const toast = useToast();

  const onKakao = async () => {
    const restKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;
    const redirectUri = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ?? Linking.createURL('auth/kakao');

    // TODO(auth): 카카오 REST KEY가 없으면 목 로그인. 백엔드/카카오 앱 연동 후 실제 authorize URL로 교체.
    if (!restKey) {
      await loginWithKakaoCode('mock-authorization-code');
      router.replace('/(tabs)');
      return;
    }

    const authorize = `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = authorize;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authorize, redirectUri);
      if (result.type === 'success' && result.url) {
        const code = Linking.parse(result.url).queryParams?.code;
        if (typeof code === 'string') {
          await loginWithKakaoCode(code);
          router.replace('/(tabs)');
          return;
        }
      }
      toast.show('카카오 로그인이 취소되었습니다.');
    } catch {
      toast.show('로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ROUTE + SOUND</Text>
        </View>
        <View style={styles.orb}>
          <Text style={styles.orbIcon}>◎</Text>
          <Text style={styles.orbCap}>여행 경로</Text>
        </View>
        <Text style={styles.brand}>AUDIGO</Text>
        <Text style={styles.headline}>{`나에게 맞는 여행을\n더 쉽게 시작하세요`}</Text>
        <Text style={styles.sub}>장소부터 이동 경로까지 한 번에 추천해드려요.</Text>
      </View>

      <View style={styles.bottom}>
        <Button label="카카오로 계속하기" variant="kakao" onPress={onKakao} />
        <Text style={styles.hint}>카카오 계정으로 간편하게 로그인합니다.</Text>
        <Pressable onPress={() => router.push('/policies')}>
          <Text style={styles.legal}>
            계속하면 <Text style={styles.link}>이용약관</Text> 및 <Text style={styles.link}>개인정보처리방침</Text>에 동의합니다.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { paddingTop: 84, alignItems: 'center' },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 22,
  },
  badgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
  orb: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  orbIcon: { fontSize: 36, color: colors.primary, marginBottom: 4 },
  orbCap: { color: colors.muted, fontWeight: '700' },
  brand: { fontSize: 20, fontWeight: '900', color: colors.navy, letterSpacing: 3, marginBottom: 14 },
  headline: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  sub: { marginTop: 12, color: colors.muted, fontSize: 14 },
  bottom: { paddingBottom: 36, gap: 14 },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12 },
  legal: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.navy, fontWeight: '700', textDecorationLine: 'underline' },
});
