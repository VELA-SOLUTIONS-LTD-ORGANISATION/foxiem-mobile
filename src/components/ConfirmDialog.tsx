import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { Button } from './Button';
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
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={busy ? () => undefined : onCancel}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} accessibilityRole="button" accessibilityLabel={cancelLabel ?? t('common.cancel')} />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.card, theme.floating, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl }]}
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
        </View>
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
