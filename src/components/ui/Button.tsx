import { colors, radius, shadow } from '@/src/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'kakao' | 'ghost' | 'dark' | 'soft';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', loading, style, disabled, ...props }: Props) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white },
    kakao: { bg: colors.kakao, fg: colors.kakaoInk },
    ghost: { bg: colors.white, fg: colors.navy },
    dark: { bg: colors.navy, fg: colors.white },
    soft: { bg: colors.primarySoft, fg: colors.primaryDark },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, opacity: disabled ? 0.45 : pressed ? 0.86 : 1 },
        variant === 'ghost' && styles.ghost,
        style,
      ]}
      {...props}>
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    ...shadow.card,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.line,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
