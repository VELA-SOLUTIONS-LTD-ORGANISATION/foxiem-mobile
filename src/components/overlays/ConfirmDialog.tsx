import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/buttons/AppButton';
import { AppText } from '@/components/typography/AppText';
import { space } from '@/theme';

import { AppModal } from './AppModal';

type ConfirmVariant = 'default' | 'warning' | 'destructive';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const resolvedConfirm = confirmLabel ?? t('common.confirm');
  const resolvedCancel = cancelLabel ?? t('common.cancel');

  useEffect(() => {
    if (!visible) {
      setBusy(false);
    }
  }, [visible]);

  return (
    <AppModal visible={visible} onClose={busy ? () => undefined : onCancel}>
      <View style={styles.content}>
        {icon}
        <AppText variant="h3">{title}</AppText>
        {message ? (
          <AppText variant="body" color="textSecondary">
            {message}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <AppButton
            title={resolvedCancel}
            variant="outline"
            disabled={busy}
            onPress={onCancel}
          />
          <AppButton
            title={resolvedConfirm}
            variant={variant === 'destructive' ? 'destructive' : variant === 'warning' ? 'dark' : 'primary'}
            loading={busy}
            disabled={busy}
            onPress={() => {
              if (busy) {
                return;
              }

              setBusy(true);
              void Promise.resolve(onConfirm()).catch(() => {
                setBusy(false);
              });
            }}
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[3],
  },
  actions: {
    gap: space[2],
    marginTop: space[2],
  },
});
