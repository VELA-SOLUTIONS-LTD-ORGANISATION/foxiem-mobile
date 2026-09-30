import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { useOverlayMotion } from './overlayMotion';
import { Text } from './Text';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  secondary?: { label: string; onPress: () => void };
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/** Centered dialog for irreversible actions. The confirm action cannot fire twice. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  secondary,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { mounted, progress } = useOverlayMotion(visible, reduceMotion);
  const [busy, setBusy] = useState(false);
  // State alone is stale between two taps in the same frame; the ref closes that gap.
  const running = useRef(false);

  const confirm = async () => {
    if (running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.94, 1] });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={busy ? () => undefined : onCancel}>
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim, opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={busy ? undefined : onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel ?? t('common.cancel')}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            theme.floating,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, opacity: progress, transform: [{ scale }] },
          ]}
        >
          <Text variant="titleSmall" accessibilityRole="header">
            {title}
          </Text>
          {message ? (
            <Text variant="body" tone="inkSecondary" style={styles.message}>
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              title={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              loading={busy}
              onPress={() => void confirm()}
            />
            {secondary ? <Button title={secondary.label} variant="secondary" disabled={busy} onPress={secondary.onPress} /> : null}
            <Button title={cancelLabel ?? t('common.cancel')} variant="ghost" disabled={busy} onPress={onCancel} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
  },
  message: {
    marginTop: 10,
  },
  actions: {
    marginTop: 20,
    gap: 8,
  },
});
