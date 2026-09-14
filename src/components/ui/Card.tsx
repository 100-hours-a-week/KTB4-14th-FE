import { colors, radius, shadow } from '@/src/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
};

export function Card({ children, style, onPress, padded = true }: Props) {
  const content = (
    <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 225, 216, 0.9)',
    ...shadow.card,
  },
  padded: {
    padding: 16,
  },
});
