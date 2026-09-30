import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/theme';

import { Text } from './Text';

type ToastInput = {
  message: string;
  action?: { label: string; onPress: () => void };
  durationMs?: number;
};

type ToastValue = {
  show: (toast: ToastInput) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastValue | null>(null);

/**
 * Messages appear at the top, below the status bar, so they never cover the count keys in
 * the thumb zone. Screen readers hear them immediately.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const [shown, setShown] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setShown(false);
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      counter.current += 1;
      setToast({ ...input, id: counter.current });
      setShown(true);
      AccessibilityInfo.announceForAccessibility(input.message);
      timer.current = setTimeout(hide, input.durationMs ?? (input.action ? 5000 : 3000));
    },
    [hide],
  );

  useEffect(() => hide, [hide]);

  // Slide in from the top edge and fade; out is quicker. A new toast replaces the text in place.
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: shown ? 1 : 0,
      duration: reduceMotion ? 80 : shown ? 220 : 160,
      easing: shown ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !shown) {
        setToast(null);
      }
    });
    return () => animation.stop();
  }, [progress, reduceMotion, shown]);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              theme.floating,
              {
                backgroundColor: theme.colors.toast,
                borderRadius: theme.radius.md,
                opacity: progress,
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : -16, 0] }) }],
              },
            ]}
          >
            <Text variant="label" color={theme.colors.onToast} style={styles.message}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                hitSlop={8}
                style={styles.action}
              >
                <Text variant="button" color={theme.colors.onToast} style={styles.actionLabel}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  message: {
    flex: 1,
    paddingVertical: 6,
  },
  action: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    textDecorationLine: 'underline',
  },
});
