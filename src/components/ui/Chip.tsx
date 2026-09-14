import { colors, radius } from '@/src/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}>
      <Text style={[styles.text, selected ? styles.selectedText : styles.idleText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  idle: {
    backgroundColor: colors.white,
    borderColor: colors.line,
  },
  selected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  idleText: { color: colors.ink },
  selectedText: { color: colors.white },
});
