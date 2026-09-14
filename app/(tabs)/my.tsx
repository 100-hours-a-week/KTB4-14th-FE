import { matchingApi, usersApi } from '@/src/api';
import { AppModal } from '@/src/components/ui/AppModal';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { colors, radius } from '@/src/theme';
import type { MyPage } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function MyPageScreen() {
  const router = useRouter();
  const { user, updateNickname, logout } = useAuth();
  const toast = useToast();
  const [me, setMe] = useState<MyPage | null>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname ?? '');

  useFocusEffect(
    useCallback(() => {
      usersApi.getMe().then(setMe);
    }, []),
  );

  const saveNickname = async () => {
    // TODO(backend-guard): 닉네임 길이/중복/금칙어 검증 후 저장. 현재는 화면 이동을 막지 않는다.
    const next = nickname.trim();
    const saved = await usersApi.updateNickname(next || me?.nickname || '여행자');
    await updateNickname(saved.nickname);
    setMe((prev) => (prev ? { ...prev, nickname: saved.nickname } : prev));
    setOpen(false);
    toast.show('닉네임이 변경되었습니다.');
  };

  return (
    <Screen>
      <ScreenHeader title="마이페이지" showBell />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(me?.nickname ?? user?.nickname ?? 'A').slice(0, 1)}</Text>
          </View>
          <Pressable style={styles.nameRow} onPress={() => setOpen(true)}>
            <Text style={styles.name}>{me?.nickname ?? user?.nickname}</Text>
            <Ionicons name="pencil" size={14} color={colors.muted} />
          </Pressable>
          <Text style={styles.provider}>카카오 계정으로 로그인됨</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{me?.completed_travel_count ?? 0}</Text>
            <Text style={styles.statLabel}>완료한 여행</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{me?.upcoming_travel_count ?? 0}</Text>
            <Text style={styles.statLabel}>예정된 여행</Text>
          </View>
        </View>

        <Menu label="여행 기록 보기" icon="map-outline" onPress={() => router.push('/my-trips')} />
        <Menu
          label="매칭 설정"
          icon="people-outline"
          onPress={() => {
            void matchingApi.getSettings();
            router.push('/matching-settings');
          }}
        />
        <Menu label="알림 설정" icon="notifications-outline" onPress={() => router.push('/notification-settings')} />
        <Menu label="이용약관 및 개인정보" icon="document-text-outline" onPress={() => router.push('/policies')} />

        <Pressable
          style={styles.logout}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      <AppModal visible={open} title="닉네임 변경" confirmLabel="변경하기" onClose={() => setOpen(false)} onConfirm={saveNickname}>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="새로운 닉네임을 입력하세요"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </AppModal>
    </Screen>
  );
}

function Menu({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menu}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={18} color={colors.navy} />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  profile: { alignItems: 'center', marginBottom: 18 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontWeight: '900', color: colors.navy },
  provider: { marginTop: 6, color: colors.muted, fontSize: 13 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 22, fontWeight: '900', color: colors.navy },
  statLabel: { marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: '700' },
  divider: { width: 1, backgroundColor: colors.line, marginVertical: 14 },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLabel: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  logout: { alignItems: 'center', paddingVertical: 18 },
  logoutText: { color: colors.muted, fontWeight: '700' },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.navy,
  },
});
