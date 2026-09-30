import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion, useResponsiveLayout } from '@/hooks';
import { contentMaxWidth, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { shouldDismissSheet, useOverlayMotion } from './overlayMotion';
import { Text } from './Text';

type SheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
};

/**
 * Bottom sheet. The scrim fades while the sheet slides (the native Modal animation would drag the scrim
 * along with it). Tapping outside, the close button, Android back and dragging the handle down all close it.
 */
export function Sheet({ visible, title, onClose, children, footer, testID }: SheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, horizontalPadding } = useResponsiveLayout();
  const reduceMotion = useReducedMotion();
  const { mounted, progress } = useOverlayMotion(visible, reduceMotion);
  const [drag] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closing.current = false;
    if (!mounted) {
      drag.setValue(0);
    }
  }, [drag, mounted, visible]);

  /** One close per open, however fast the taps arrive. */
  const requestClose = () => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    onCloseRef.current();
  };

  // The handlers only touch `closing` when a gesture ends, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (shouldDismissSheet(gesture.dy, gesture.vy)) {
          requestClose();
        } else {
          Animated.spring(drag, { toValue: 0, stiffness: 420, damping: 32, mass: 0.7, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, stiffness: 420, damping: 32, mass: 0.7, useNativeDriver: true }).start();
      },
    }),
  );

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : height, 0] });
  const translateY = Animated.add(slide, drag);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={requestClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backdrop}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim, opacity: progress }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={t('common.closeSheet')}
              onPress={requestClose}
            />
          </Animated.View>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              theme.floating,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                maxHeight: height * 0.88,
                paddingBottom: Math.max(insets.bottom, 16),
                maxWidth: contentMaxWidth,
                opacity: reduceMotion ? progress : 1,
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.dragZone}>
              <View style={[styles.handle, { backgroundColor: theme.colors.lineStrong }]} />
              <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <Text variant="titleSmall" style={styles.title} accessibilityRole="header" numberOfLines={2}>
                  {title ?? ''}
                </Text>
                <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={requestClose} style={styles.close} />
              </View>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={[styles.body, { paddingHorizontal: horizontalPadding }]}
            >
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    paddingTop: 8,
  },
  dragZone: {
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  title: {
    flex: 1,
  },
  close: {
    marginRight: -12,
  },
  body: {
    paddingBottom: 16,
    gap: 16,
  },
  footer: {
    paddingTop: 8,
    gap: 8,
  },
});
