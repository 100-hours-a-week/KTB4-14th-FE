import { Button } from '@/src/components/ui/Button';
import { CalendarSheet, TimeSheet, toDateLabel } from '@/src/components/ui/DateTime';
import { Chip } from '@/src/components/ui/Chip';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTravelDraft } from '@/src/context/TravelDraftContext';
import { destinations } from '@/src/mocks/data';
import { colors, radius } from '@/src/theme';
import { companionOptions, transportOptions } from '@/src/lib/options';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal } from '@/src/components/ui/AppModal';
import { Progress } from '@/src/components/ui/Progress';
import type { CompanionType, TransportType } from '@/src/types';

export default function CreateTravelBasics() {
  const router = useRouter();
  const { draft, update } = useTravelDraft();
  const [picker, setPicker] = useState<null | 'dest' | 'startDate' | 'endDate' | 'startTime' | 'endTime'>(null);

  const goNext = () => {
    // TODO(backend-guard): 목적지/동행/기간/이동수단 미입력 시 다음 단계 진입을 막는다.
    // 현재는 백엔드 검증 연동 전이라 화면 이동을 제한하지 않는다.
    router.push('/create-travel/preference');
  };

  return (
    <Screen>
      <ScreenHeader title="여행 생성하기" onBack={() => router.back()} showBell />
      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={1} />
        <Field label="목적지">
          <Select value={draft.destination ?? '도시를 선택해 주세요'} onPress={() => setPicker('dest')} />
        </Field>
        <Field label="나와 함께할 사람은?">
          <View style={styles.wrap}>
            {companionOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={draft.companion === item.value}
                onPress={() => update({ companion: item.value as CompanionType })}
              />
            ))}
          </View>
        </Field>
        <Field label="여행 기간">
          <View style={styles.row}>
            <Select value={toDateLabel(draft.start_date)} onPress={() => setPicker('startDate')} style={{ flex: 1 }} />
            <Select value={draft.start_time ?? '시작 시간'} onPress={() => setPicker('startTime')} style={{ width: 110 }} />
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Select value={toDateLabel(draft.end_date)} onPress={() => setPicker('endDate')} style={{ flex: 1 }} />
            <Select value={draft.end_time ?? '종료 시간'} onPress={() => setPicker('endTime')} style={{ width: 110 }} />
          </View>
        </Field>
        <Field label="이동 수단">
          <View style={styles.wrap}>
            {transportOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={draft.transport === item.value}
                onPress={() => update({ transport: item.value as TransportType })}
              />
            ))}
          </View>
        </Field>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="다음: 여행 취향" variant="dark" onPress={goNext} />
      </View>

      <AppModal
        visible={picker === 'dest'}
        title="목적지 선택"
        confirmLabel="닫기"
        cancelLabel="취소"
        onClose={() => setPicker(null)}
        onConfirm={() => setPicker(null)}>
        <View style={styles.wrap}>
          {destinations.map((city) => (
            <Chip
              key={city}
              label={city}
              selected={draft.destination === city}
              onPress={() => {
                update({ destination: city });
                setPicker(null);
              }}
            />
          ))}
        </View>
      </AppModal>

      <AppModal visible={picker === 'startDate'} title="시작 날짜" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <CalendarSheet value={draft.start_date} onSelect={(value) => update({ start_date: value })} />
      </AppModal>
      <AppModal visible={picker === 'endDate'} title="종료 날짜" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <CalendarSheet value={draft.end_date} onSelect={(value) => update({ end_date: value })} />
      </AppModal>
      <AppModal visible={picker === 'startTime'} title="시작 시간" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <TimeSheet value={draft.start_time} onSelect={(value) => update({ start_time: value })} />
      </AppModal>
      <AppModal visible={picker === 'endTime'} title="종료 시간" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <TimeSheet value={draft.end_time} onSelect={(value) => update({ end_time: value })} />
      </AppModal>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Select({ value, onPress, style }: { value: string; onPress: () => void; style?: object }) {
  return (
    <Pressable onPress={onPress} style={[styles.select, style]}>
      <Text style={styles.selectText}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 24 },
  footer: { padding: 20, paddingTop: 8 },
  label: { fontWeight: '800', color: colors.navy, marginBottom: 10, fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: 8 },
  select: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.ink, fontWeight: '700' },
});
