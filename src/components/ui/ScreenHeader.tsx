import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  showBell?: boolean;
  unread?: number;
};

export function ScreenHeader({ title, onBack, right, showBell, unread = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.navy} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.side, styles.right]}>
        {showBell ? (
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.navy} />
            {unread > 0 ? <View style={styles.badge} /> : null}
          </Pressable>
        ) : (
          right
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  side: { width: 56, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
