import { colors, radius } from '@/src/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateLabel(value?: string) {
  return value ? value.replaceAll('-', '.') : '날짜 선택';
}

export function CalendarSheet({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (iso: string) => void;
}) {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad + daysInMonth }, (_, i) =>
    i < startPad ? null : i - startPad + 1,
  );

  return (
    <View>
      <Text style={styles.month}>
        {year}년 {month + 1}월
      </Text>
      <View style={styles.weekRow}>
        {WEEK.map((d) => (
          <Text key={d} style={styles.week}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          const iso = day ? `${year}-${pad(month + 1)}-${pad(day)}` : '';
          const selected = iso === value;
          return (
            <Pressable
              key={`${iso}-${index}`}
              disabled={!day}
              onPress={() => day && onSelect(iso)}
              style={[styles.cell, selected && styles.selected]}>
              <Text style={[styles.day, selected && styles.selectedText]}>{day ?? ''}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TimeSheet({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (hhmm: string) => void;
}) {
  const [h, m] = (value ?? '10:00').split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 10, 20, 30, 40, 50];
  return (
    <View style={styles.timeWrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cap}>시</Text>
        <View style={styles.timeGrid}>
          {hours.map((hour) => (
            <Pressable
              key={hour}
              onPress={() => onSelect(`${pad(hour)}:${pad(m || 0)}`)}
              style={[styles.timeChip, hour === h && styles.selected]}>
              <Text style={[styles.day, hour === h && styles.selectedText]}>{pad(hour)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cap}>분</Text>
        <View style={styles.timeGrid}>
          {minutes.map((minute) => (
            <Pressable
              key={minute}
              onPress={() => onSelect(`${pad(h || 0)}:${pad(minute)}`)}
              style={[styles.timeChip, minute === m && styles.selected]}>
              <Text style={[styles.day, minute === m && styles.selectedText]}>{pad(minute)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  month: { fontSize: 16, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 12 },
  weekRow: { flexDirection: 'row' },
  week: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  selected: { backgroundColor: colors.navy },
  day: { color: colors.ink, fontWeight: '700' },
  selectedText: { color: colors.white },
  timeWrap: { flexDirection: 'row', gap: 12, maxHeight: 280 },
  cap: { fontWeight: '800', color: colors.navy, marginBottom: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  timeChip: {
    width: '33%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
});
