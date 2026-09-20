import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks';
import { colors, radius, shadows, space } from '@/theme';

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function AppModal({ visible, onClose, children }: AppModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height, horizontalPadding } = useResponsiveLayout();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.closeModal')}
          onPress={onClose}
          style={styles.backdropPress}
        />
        <View
          style={[
            styles.card,
            {
              maxHeight: height * 0.9,
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom, space[6]),
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={styles.scroll}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space[5],
    overflow: 'hidden',
    ...shadows.none,
    elevation: 0,
    zIndex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: space[2],
  },
});
