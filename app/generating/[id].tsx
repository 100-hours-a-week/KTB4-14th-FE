import { travelsApi } from '@/src/api';
import { AppModal } from '@/src/components/ui/AppModal';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { colors, radius } from '@/src/theme';
import type { TravelGenerationStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function GeneratingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const planId = Number(id);
  const [status, setStatus] = useState<TravelGenerationStatus | null>(null);
  const [failOpen, setFailOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      const next = await travelsApi.getStatus(planId);
      if (cancelled) return;
      setStatus(next);
      if (next.status === 'COMPLETED') {
        if (timer) clearInterval(timer);
        router.replace(`/itinerary/${planId}`);
      }
      if (next.status === 'FAILED') {
        if (timer) clearInterval(timer);
        setFailOpen(true);
      }
    };
    void tick();
    timer = setInterval(tick, 800);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [planId, router, runKey]);

  const failed = status?.status === 'FAILED';

  return (
    <Screen>
      <ScreenHeader title="여행 추천 중" onBack={() => router.replace('/(tabs)')} showBell />
      <View style={styles.body}>
        <Text style={styles.title}>
          {failed ? '최적의 여행을 만드는 데 실패하였습니다.' : '최적의 여행을 만드는 중입니다'}
        </Text>
        <View style={[styles.orb, failed && styles.orbFail]}>
          <Ionicons name={failed ? 'close' : 'ellipsis-horizontal'} size={32} color={failed ? colors.danger : colors.navy} />
        </View>
        <View style={{ width: '100%', gap: 10 }}>
          {(status?.steps ?? []).map((step) => (
            <View key={step.key} style={styles.step}>
              <View style={[styles.check, step.state === 'DONE' && styles.checkOn, step.state === 'FAILED' && styles.checkFail]}>
                {step.state === 'DONE' ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                {step.state === 'FAILED' ? <Ionicons name="close" size={14} color={colors.white} /> : null}
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {failed
              ? '잠시 후 다시 시도해 주세요. 입력값을 바꾸면 더 안정적으로 생성될 수 있어요.'
              : '완성되면 알림을 보내드릴게요. 다른 화면으로 이동해도 생성이 이어집니다.'}
          </Text>
        </View>
        {failed ? (
          <Pressable
            style={styles.retry}
            onPress={async () => {
              setFailOpen(false);
              await travelsApi.regenerate(planId);
              setRunKey((value) => value + 1);
            }}>
            <Text style={styles.retryText}>다시 생성하기</Text>
          </Pressable>
        ) : null}
      </View>
      <AppModal
        visible={failOpen}
        title="일정 생성에 실패했습니다."
        confirmLabel="확인"
        cancelLabel="닫기"
        onClose={() => setFailOpen(false)}
        onConfirm={() => setFailOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 24, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 22,
  },
  orb: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    backgroundColor: colors.white,
  },
  orbFail: { borderColor: colors.danger },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkFail: { backgroundColor: colors.danger, borderColor: colors.danger },
  stepLabel: { fontWeight: '800', color: colors.navy },
  notice: {
    marginTop: 24,
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    padding: 14,
  },
  noticeText: { color: colors.muted, textAlign: 'center', lineHeight: 20, fontSize: 13 },
  retry: { marginTop: 16 },
  retryText: { color: colors.primary, fontWeight: '800' },
});
