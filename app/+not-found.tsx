import { policiesApi } from '@/src/api';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { colors, radius } from '@/src/theme';
import type { Policy, PolicyType } from '@/src/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PoliciesScreen() {
  const router = useRouter();
  const [type, setType] = useState<PolicyType>('TERMS_OF_SERVICE');
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    policiesApi.getLatest(type).then(setPolicy);
  }, [type]);

  return (
    <Screen>
      <ScreenHeader title="이용약관 및 개인정보" onBack={() => router.back()} />
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, type === 'TERMS_OF_SERVICE' && styles.tabOn]} onPress={() => setType('TERMS_OF_SERVICE')}>
          <Text style={[styles.tabText, type === 'TERMS_OF_SERVICE' && styles.tabTextOn]}>이용약관</Text>
        </Pressable>
        <Pressable style={[styles.tab, type === 'PRIVACY_POLICY' && styles.tabOn]} onPress={() => setType('PRIVACY_POLICY')}>
          <Text style={[styles.tabText, type === 'PRIVACY_POLICY' && styles.tabTextOn]}>개인정보</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{policy?.title}</Text>
        <Text style={styles.meta}>
          v{policy?.version} · {policy?.effective_date}
        </Text>
        <Text style={styles.body}>{policy?.content}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.sand, borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.white },
  tabText: { fontWeight: '800', color: colors.muted },
  tabTextOn: { color: colors.navy },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '900', color: colors.navy },
  meta: { marginTop: 6, marginBottom: 16, color: colors.muted },
  body: { color: colors.ink, lineHeight: 22, fontSize: 14 },
});
