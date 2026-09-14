import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTravelDraft } from '@/src/context/TravelDraftContext';
import { foodOptions, paceOptions, regionOptions, styleOptions } from '@/src/lib/options';
import { colors, radius } from '@/src/theme';
import type { FoodPreference, RegionPreference, TripPace, TripStyle } from '@/src/types';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Progress } from '@/src/components/ui/Progress';

export default function PreferenceScreen() {
  const router = useRouter();
  const { draft, updatePreference } = useTravelDraft();
  const pref = draft.preference;

  const toggleFood = (value: FoodPreference) => {
    const current = pref.food_preferences;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updatePreference({ food_preferences: next });
  };

  return (
    <Screen>
      <ScreenHeader title="여행 생성하기" onBack={() => router.back()} showBell />
      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={2} />
        <Text style={styles.label}>여행 스타일 / 여행 성격</Text>
        <View style={styles.wrap}>
          {styleOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.style === item.value}
              onPress={() => updatePreference({ style: item.value as TripStyle })}
            />
          ))}
        </View>

        <Text style={styles.label}>선호 지역 방문 성향</Text>
        <View style={styles.wrap}>
          {regionOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.region_preference === item.value}
              onPress={() => updatePreference({ region_preference: item.value as RegionPreference })}
            />
          ))}
        </View>

        <Text style={styles.label}>식사 취향</Text>
        <View style={styles.wrap}>
          {foodOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.food_preferences.includes(item.value as FoodPreference)}
              onPress={() => toggleFood(item.value as FoodPreference)}
            />
          ))}
        </View>

        <Text style={styles.label}>활동 강도</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.cap}>여유</Text>
          <View style={styles.track}>
            {[0, 25, 50, 75, 100].map((n) => (
              <Pressable
                key={n}
                onPress={() => updatePreference({ activity_level: n })}
                style={[styles.seg, n <= pref.activity_level && styles.segOn]}
              />
            ))}
          </View>
          <Text style={styles.cap}>활동적</Text>
        </View>

        <Text style={styles.label}>일정 밀도</Text>
        <View style={styles.wrap}>
          {paceOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.pace === item.value}
              onPress={() => updatePreference({ pace: item.value as TripPace })}
            />
          ))}
        </View>

        <Text style={styles.label}>추가 요청사항</Text>
        <TextInput
          value={pref.extra_request}
          onChangeText={(text) => updatePreference({ extra_request: text })}
          placeholder="원하는 일정 조건을 자유롭게 알려주세요"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.area}
        />
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="다음: 필수 장소"
          variant="dark"
          onPress={() => {
            // TODO(backend-guard): 여행 스타일/지역/식사 미선택 시 다음 단계 진입을 막는다.
            router.push('/create-travel/places');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 24 },
  footer: { padding: 20 },
  label: { fontWeight: '800', color: colors.navy, marginBottom: 10, marginTop: 8, fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cap: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  track: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 10, borderRadius: 99, backgroundColor: colors.line },
  segOn: { backgroundColor: colors.navy },
  area: {
    minHeight: 92,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    textAlignVertical: 'top',
    color: colors.navy,
  },
});
