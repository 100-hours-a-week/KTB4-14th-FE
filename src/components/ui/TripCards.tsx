import { colors, radius } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TravelSummary } from '@/src/types';

function dday(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / 86400000);
}

function formatRange(start: string, end: string) {
  return `${start.replaceAll('-', '.')} - ${end.replaceAll('-', '.')}`;
}

export function TripHeroCard({
  trip,
  onPress,
}: {
  trip: TravelSummary;
  onPress: () => void;
}) {
  const day = dday(trip.start_date);
  return (
    <View style={styles.hero}>
      <View style={styles.glow} />
      <View style={styles.dday}>
        <Text style={styles.ddayText}>{day >= 0 ? `D-${day}` : `D+${Math.abs(day)}`}</Text>
      </View>
      <Text style={styles.title}>{trip.title}</Text>
      <Text style={styles.meta}>
        {formatRange(trip.start_date, trip.end_date)} · 추천 완료
      </Text>
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>일정 이어보기</Text>
      </Pressable>
    </View>
  );
}

export function TripListCard({
  trip,
  onPress,
}: {
  trip: TravelSummary;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={[styles.dot, { backgroundColor: trip.cover_color ?? colors.teal }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{trip.title}</Text>
        <Text style={styles.listMeta}>
          {formatRange(trip.start_date, trip.end_date)}
          {trip.companion_label ? ` · ${trip.companion_label}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
    padding: 20,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  dday: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  ddayText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  meta: { color: 'rgba(255,255,255,0.72)', marginTop: 8, fontSize: 13 },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaText: { color: colors.navy, fontWeight: '800', fontSize: 13 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  listTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  listMeta: { marginTop: 4, color: colors.muted, fontSize: 13 },
});
