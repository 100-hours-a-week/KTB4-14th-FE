import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없습니다', headerShown: false }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>페이지를 찾을 수 없습니다</Text>
        <Link href="/" style={styles.link}>
          홈으로 돌아가기
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, gap: 12 },
  title: { fontWeight: '900', color: colors.navy, fontSize: 18 },
  link: { color: colors.primary, fontWeight: '800' },
});
