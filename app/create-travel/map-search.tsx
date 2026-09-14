import { placesApi } from '@/src/api';
import { PlaceRow } from '@/src/components/ui/PlaceRow';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useToast } from '@/src/context/ToastContext';
import { useTravelDraft } from '@/src/context/TravelDraftContext';
import { colors, radius } from '@/src/theme';
import type { PlaceCandidate } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function MapSearchScreen() {
  const router = useRouter();
  const toast = useToast();
  const { addPlace } = useTravelDraft();
  const { replaceItemId } = useLocalSearchParams<{ replaceItemId?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);

  useEffect(() => {
    placesApi.search('제주').then(setResults);
  }, []);

  const search = async () => {
    const found = await placesApi.search(query);
    setResults(found);
    setSelected(found[0] ?? null);
  };

  const add = async (place: PlaceCandidate) => {
    if (replaceItemId) {
      await placesApi.changePlace(Number(replaceItemId), place);
      toast.show('장소가 변경되었습니다.');
      router.back();
      return;
    }
    addPlace(place);
    toast.show('장소가 추가되었습니다.');
  };

  return (
    <Screen>
      <ScreenHeader title="여행 생성하기" onBack={() => router.back()} showBell />
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="장소를 검색해 주세요"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={search}
        />
        <Pressable onPress={search} style={styles.searchBtn}>
          <Ionicons name="search" size={18} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.map}>
        <View style={styles.road} />
        <View style={[styles.road, styles.road2]} />
        {results.map((place, index) => (
          <Pressable
            key={place.provider_place_id}
            onPress={() => setSelected(place)}
            style={[
              styles.pin,
              {
                left: `${18 + ((index * 23) % 62)}%`,
                top: `${22 + ((index * 17) % 48)}%`,
                backgroundColor: selected?.provider_place_id === place.provider_place_id ? colors.navy : colors.white,
              },
            ]}>
            <Text
              style={{
                color: selected?.provider_place_id === place.provider_place_id ? colors.white : colors.navy,
                fontWeight: '800',
                fontSize: 11,
              }}>
              {index + 1}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.mapHint}>카카오맵 SDK 연동 전 미리보기 지도</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {selected ? (
          <View style={{ marginBottom: 10 }}>
            <PlaceRow place={selected} onAdd={() => add(selected)} />
          </View>
        ) : null}
        <Text style={styles.cap}>검색 결과</Text>
        <View style={{ gap: 8 }}>
          {results.map((place) => (
            <PlaceRow key={place.provider_place_id} place={place} onAdd={() => add(place)} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.navy,
  },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    height: 220,
    marginHorizontal: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.map,
    overflow: 'hidden',
    marginBottom: 12,
  },
  road: {
    position: 'absolute',
    left: -20,
    top: 90,
    width: '140%',
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '-8deg' }],
  },
  road2: { top: 150, transform: [{ rotate: '12deg' }] },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  mapHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '700',
  },
  list: { padding: 20, paddingTop: 4 },
  cap: { fontWeight: '800', color: colors.navy, marginBottom: 8 },
});
