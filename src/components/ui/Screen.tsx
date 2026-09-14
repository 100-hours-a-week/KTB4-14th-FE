import { colors, layout } from '@/src/theme';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({
  children,
  style,
  edges = ['left', 'right'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

export function PhoneShell({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.fill}>{children}</View>;
  }
  return (
    <View style={styles.webPage}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  screen: { flex: 1, backgroundColor: colors.cream },
  webPage: {
    flex: 1,
    height: '100%',
    backgroundColor: '#d9cfc3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  phone: {
    width: '100%',
    maxWidth: layout.phoneWidth,
    height: '100%',
    maxHeight: 920,
    backgroundColor: colors.cream,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(28,36,48,0.08)',
  },
});
