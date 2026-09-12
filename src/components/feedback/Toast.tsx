import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, shadows, sizes, space } from '@/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastPayload = {
  type: ToastType;
  title: string;
  message?: string;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_VISIBLE_MS = 2000;
const TOAST_ANIMATION_MS = 260;
const TOAST_HIDDEN_OFFSET = 120;

const TONE: Record<
  ToastType,
  { background: keyof typeof colors; title: keyof typeof colors; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { background: 'successSoft', title: 'success', icon: 'checkmark-circle' },
  error: { background: 'errorSoft', title: 'error', icon: 'alert-circle' },
  info: { background: 'infoSoft', title: 'info', icon: 'information-circle' },
  warning: { background: 'warningSoft', title: 'warning', icon: 'warning' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(TOAST_HIDDEN_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingOutRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      if (isAnimatingOutRef.current) {
        return;
      }

      isAnimatingOutRef.current = true;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: TOAST_HIDDEN_OFFSET,
          duration: TOAST_ANIMATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: TOAST_ANIMATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        isAnimatingOutRef.current = false;
        if (finished) {
          setToast(null);
          onDone?.();
        }
      });
    },
    [opacity, translateY],
  );

  const dismissToast = useCallback(() => {
    clearHideTimer();
    animateOut();
  }, [animateOut, clearHideTimer]);

  const showToast = useCallback(
    (payload: ToastPayload) => {
      clearHideTimer();
      isAnimatingOutRef.current = false;
      translateY.setValue(TOAST_HIDDEN_OFFSET);
      opacity.setValue(0);
      setToast(payload);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: TOAST_ANIMATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: TOAST_ANIMATION_MS,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimerRef.current = setTimeout(() => {
        animateOut();
      }, TOAST_VISIBLE_MS);
    },
    [animateOut, clearHideTimer, opacity, translateY],
  );

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const bottomOffset = Math.max(insets.bottom, space[4]) + sizes.controlLg + space[2];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            {
              bottom: bottomOffset,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            role="button"
            aria-label="Dismiss toast"
            onPress={dismissToast}
            style={[styles.toast, { backgroundColor: colors[TONE[toast.type].background] }]}
          >
            <Ionicons
              name={TONE[toast.type].icon}
              size={sizes.iconLg}
              color={colors[TONE[toast.type].title]}
            />
            <View style={styles.copy}>
              <AppText variant="label" color={TONE[toast.type].title}>
                {toast.title}
              </AppText>
              {toast.message ? (
                <AppText variant="caption" color="textSecondary">
                  {toast.message}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    zIndex: 1000,
  },
  toast: {
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[3],
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...shadows.md,
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
});
