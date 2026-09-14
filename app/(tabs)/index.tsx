import { notificationsApi, travelsApi } from '@/src/api';
import { Screen } from '@/src/components/ui/Screen';
import { TripHeroCard, TripListCard } from '@/src/components/ui/TripCards';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TravelSummary } from '@/src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<TravelSummary | null>(null);
  const [recent, setRecent] = useState<TravelSummary[]>([]);
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [next, rec, count] = await Promise.all([
          travelsApi.getUpcoming(),
          travelsApi.getRecent(),
          notificationsApi.unreadCount(),
        ]);
        if (!alive) return;
        setUpcoming(next);
        setRecent(rec);
        setUnread(count.count);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.kicker}>내 여행</Text>
          <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={colors.navy} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
        <Text style={styles.hello}>안녕하세요, {user?.nickname ?? '여행자'}님</Text>
        <Text style={styles.title}>다음 여행을 이어서 준비해요</Text>

        {upcoming ? (
          <TripHeroCard trip={upcoming} onPress={() => router.push(`/itinerary/${upcoming.travel_plan_id}`)} />
        ) : (
          <View style={styles.emptyHero}>
            <Text style={styles.emptyHeroText}>여행을 만들어볼까요?</Text>
          </View>
        )}

        <Text style={styles.section}>추천 메뉴</Text>
        <View style={styles.menus}>
          <Pressable style={styles.menu} onPress={() => router.push('/my-trips')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.tealSoft }]}>
              <Ionicons name="map-outline" size={18} color={colors.tealDark} />
            </View>
            <Text style={styles.menuTitle}>여행 기록 보기</Text>
            <Text style={styles.menuSub}>다녀온 여행 보러가기</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.menu} onPress={() => router.push('/create-travel')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>여행 생성하기</Text>
            <Text style={styles.menuSub}>AI가 만들어주는 여행 코스</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.section}>최근 여행</Text>
        {recent.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>최근에 다녀온 여행이 없습니다.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {recent.map((trip) => (
              <TripListCard
                key={trip.travel_plan_id}
                trip={trip}
                onPress={() => router.push(`/itinerary/${trip.travel_plan_id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 15, color: colors.muted, fontWeight: '700' },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  hello: { marginTop: 8, color: colors.muted, fontSize: 14 },
  title: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.8,
  },
  emptyHero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 28,
    alignItems: 'center',
  },
  emptyHeroText: { color: colors.muted, fontWeight: '700' },
  section: { marginTop: 26, marginBottom: 12, fontSize: 16, fontWeight: '800', color: colors.navy },
  menus: { flexDirection: 'row', gap: 10 },
  menu: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 132,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  menuSub: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  emptyList: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyListText: { color: colors.muted, textAlign: 'center' },
});
