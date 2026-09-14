import { colors, radius } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaceCandidate } from '@/src/types';

export function PlaceRow({
  place,
  onRemove,
  onAdd,
}: {
  place: PlaceCandidate;
  onRemove?: () => void;
  onAdd?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.pin}>
        <Ionicons name="location" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.addr}>{place.address}</Text>
      </View>
      {onAdd ? (
        <Pressable onPress={onAdd} style={styles.add}>
          <Text style={styles.addText}>추가</Text>
        </Pressable>
      ) : null}
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  addr: { color: colors.muted, fontSize: 12, marginTop: 3 },
  add: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addText: { color: colors.white, fontWeight: '800', fontSize: 12 },
});
