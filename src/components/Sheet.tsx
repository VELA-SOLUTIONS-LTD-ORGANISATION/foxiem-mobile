import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks';
import { contentMaxWidth, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type SheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
};

/** Bottom sheet with a real scrim; Android back and tapping outside both close it. */
export function Sheet({ visible, title, onClose, children, footer, testID }: SheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, horizontalPadding } = useResponsiveLayout();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('common.closeSheet')}
            onPress={onClose}
          />
          <View
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
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.lineStrong }]} />
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
              <Text variant="titleSmall" style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {title ?? ''}
              </Text>
              <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={[styles.body, { paddingHorizontal: horizontalPadding }]}
            >
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>{footer}</View> : null}
          </View>
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
