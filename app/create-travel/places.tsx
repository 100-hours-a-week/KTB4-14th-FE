import { travelsApi } from '@/src/api';
import { AppModal } from '@/src/components/ui/AppModal';
import { Button } from '@/src/components/ui/Button';
import { PlaceRow } from '@/src/components/ui/PlaceRow';
import { Progress } from '@/src/components/ui/Progress';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTravelDraft } from '@/src/context/TravelDraftContext';
import { toDatetime } from '@/src/lib/options';
import { colors, radius } from '@/src/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RequiredPlacesScreen() {
  const router = useRouter();
  const { draft, removePlace, reset } = useTravelDraft();
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    // TODO(backend-guard): 필수 값이 비어 있어도 현재는 생성 요청을 막지 않는다.
    setLoading(true);
    try {
      const created = await travelsApi.create({
        destination: draft.destination ?? '제주',
        companion: draft.companion ?? 'COUPLE',
        start_datetime: toDatetime(draft.start_date, draft.start_time),
        end_datetime: toDatetime(draft.end_date, draft.end_time),
        transport: draft.transport ?? 'CAR',
        preference: draft.preference,
        required_places: draft.required_places,
      });
      reset();
      router.replace(`/generating/${created.travel_plan_id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="여행 생성하기" onBack={() => router.back()} showBell />
      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={3} />
        <Text style={styles.section}>선택된 장소</Text>
        {draft.required_places.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 선택한 장소가 없어요.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {draft.required_places.map((place) => (
              <PlaceRow
                key={place.provider_place_id}
                place={place}
                onRemove={() => setTarget(place.provider_place_id)}
              />
            ))}
          </View>
        )}
        <Pressable style={styles.add} onPress={() => router.push('/create-travel/map-search')}>
          <Text style={styles.addText}>+ 카카오맵에서 장소 추가</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="AI 여행 생성하기" variant="dark" loading={loading} onPress={generate} />
      </View>
      <AppModal
        visible={!!target}
        title="선택한 장소를 삭제하시겠어요?"
        message="이 장소는 필수 방문 목록에서 바로 빠집니다."
        confirmLabel="확인"
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (target) removePlace(target);
          setTarget(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  footer: { padding: 20 },
  section: { fontWeight: '800', color: colors.navy, marginBottom: 12, fontSize: 16 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyText: { color: colors.muted, textAlign: 'center' },
  add: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addText: { fontWeight: '800', color: colors.navy },
});
