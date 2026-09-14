import { travelsApi } from '@/src/api';
import { AppModal } from '@/src/components/ui/AppModal';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { nightsAndDays } from '@/src/lib/options';
import { colors, radius } from '@/src/theme';
import type { ItineraryItem, TravelDetail } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const planId = Number(id);
  const [detail, setDetail] = useState<TravelDetail | null>(null);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [recreate, setRecreate] = useState(false);

  useEffect(() => {
    travelsApi.getDetail(planId).then(setDetail);
  }, [planId]);

  if (!detail) {
    return (
      <Screen>
        <ScreenHeader title="추천 경로" onBack={() => router.back()} showBell />
      </Screen>
    );
  }

  const places = detail.itinerary_days.flatMap((day) => day.items.filter((item) => item.type === 'PLACE'));

  return (
    <Screen>
      <ScreenHeader title="추천 경로" onBack={() => router.back()} showBell />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{detail.title}</Text>
            <Text style={styles.meta}>
              {detail.start_date.replaceAll('-', '.')} - {detail.end_date.replaceAll('-', '.')} · {nightsAndDays(detail.start_date, detail.end_date)}
            </Text>
          </View>
          <Pressable style={styles.recreate} onPress={() => setRecreate(true)}>
            <Text style={styles.recreateText}>일정 다시 만들기</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'list' && styles.tabOn]} onPress={() => setTab('list')}>
            <Text style={[styles.tabText, tab === 'list' && styles.tabTextOn]}>장소</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'map' && styles.tabOn]} onPress={() => setTab('map')}>
            <Text style={[styles.tabText, tab === 'map' && styles.tabTextOn]}>이동 경로</Text>
          </Pressable>
        </View>

        {tab === 'map' ? (
          <View style={styles.map}>
            {places.map((place, index) => (
              <View
                key={place.itinerary_item_id}
                style={[
                  styles.mapPin,
                  { left: `${12 + ((index * 18) % 70)}%`, top: `${16 + ((index * 14) % 60)}%` },
                ]}>
                <Text style={styles.mapPinText}>{index + 1}</Text>
              </View>
            ))}
            <View style={styles.path} />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {detail.itinerary_days.map((day) => (
              <View key={day.itinerary_day_id} style={styles.day}>
                <Text style={styles.dayTitle}>DAY {day.day_number}</Text>
                <Text style={styles.dayDate}>{day.date.replaceAll('-', '.')}</Text>
                {day.items.map((item) => (
                  <ItineraryRow
                    key={item.itinerary_item_id}
                    item={item}
                    onChangePlace={() => router.push(`/create-travel/map-search?replaceItemId=${item.itinerary_item_id}`)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {detail.recommended_music.length > 0 ? (
          <View style={styles.music}>
            <Text style={styles.musicTitle}>추천 음악</Text>
            {detail.recommended_music.map((track) => (
              <Text key={track.track_id} style={styles.track}>
                {track.title} · {track.artist}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.bottom}>
        <Pressable style={styles.bottomBtn} onPress={() => router.push(`/checklist/${planId}`)}>
          <Ionicons name="checkbox-outline" size={18} color={colors.navy} />
          <Text style={styles.bottomText}>체크리스트</Text>
        </Pressable>
        <Pressable style={styles.bottomBtn} onPress={() => router.push(`/video/${planId}`)}>
          <Ionicons name="play-circle-outline" size={18} color={colors.navy} />
          <Text style={styles.bottomText}>여행 영상</Text>
        </Pressable>
      </View>
      <AppModal
        visible={recreate}
        title="일정을 다시 만들까요?"
        message="일정이 다시 생성되면 현재 저장된 일정이 사라집니다."
        confirmLabel="확인"
        onClose={() => setRecreate(false)}
        onConfirm={async () => {
          setRecreate(false);
          const created = await travelsApi.regenerate(planId);
          router.replace(`/generating/${created.travel_plan_id}`);
        }}
      />
    </Screen>
  );
}

function ItineraryRow({ item, onChangePlace }: { item: ItineraryItem; onChangePlace: () => void }) {
  if (item.type === 'ROUTE') {
    return (
      <View style={styles.route}>
        <Ionicons name="navigate-outline" size={14} color={colors.teal} />
        <Text style={styles.routeText}>
          이동 {item.duration_minutes}분 · {item.distance_km}km
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.place}>
      <View style={{ flex: 1 }}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeMeta}>
          {item.start_time ?? ''} {item.stay_minutes ? `· ${item.stay_minutes}분 체류` : ''}
        </Text>
        {item.address ? <Text style={styles.placeMeta}>{item.address}</Text> : null}
      </View>
      <Pressable onPress={onChangePlace} hitSlop={8}>
        <Ionicons name="create-outline" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: colors.navy, letterSpacing: -0.5 },
  meta: { marginTop: 6, color: colors.muted, fontSize: 13 },
  recreate: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recreateText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  tabs: { flexDirection: 'row', backgroundColor: colors.sand, borderRadius: radius.pill, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.white },
  tabText: { fontWeight: '800', color: colors.muted },
  tabTextOn: { color: colors.navy },
  map: {
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.map,
    overflow: 'hidden',
    marginBottom: 16,
  },
  path: {
    position: 'absolute',
    left: 40,
    top: 40,
    width: 220,
    height: 160,
    borderWidth: 2,
    borderColor: colors.navy,
    borderRadius: 80,
    opacity: 0.35,
  },
  mapPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  day: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.line },
  dayTitle: { fontWeight: '900', color: colors.navy, fontSize: 16 },
  dayDate: { color: colors.muted, marginBottom: 10, marginTop: 2, fontSize: 12 },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  placeName: { fontWeight: '800', color: colors.navy },
  placeMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  routeText: { color: colors.tealDark, fontSize: 12, fontWeight: '700' },
  music: { marginTop: 8, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 14 },
  musicTitle: { fontWeight: '900', color: colors.primaryDark, marginBottom: 6 },
  track: { color: colors.navy, fontSize: 13, marginTop: 2 },
  bottom: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  bottomBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  bottomText: { fontWeight: '800', color: colors.navy },
});
