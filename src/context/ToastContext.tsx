import { colors, radius } from '@/src/theme';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type ToastContextValue = { show: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
          setMessage(null);
        });
      }, 1800);
    },
    [opacity],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 96,
    backgroundColor: 'rgba(28, 36, 48, 0.88)',
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    zIndex: 50,
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
