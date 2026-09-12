import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/typography/AppText';
import { useResponsiveLayout } from '@/hooks';
import { colors, radius, shadows, space } from '@/theme';
import { useTranslation } from 'react-i18next';

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
};

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  header,
  scroll = true,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height, horizontalPadding } = useResponsiveLayout();

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      bounces={false}
      contentContainerStyle={styles.body}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.bodyStatic}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.closeSheet')}
          onPress={onClose}
          style={styles.backdropPress}
        />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.9,
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom, space[6]),
            },
          ]}
        >
          <View style={styles.handle} />
          {header}
          {title ? (
            <AppText variant="h3" align="center">
              {title}
            </AppText>
          ) : null}
          {body}
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
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space[3],
    gap: space[3],
    overflow: 'hidden',
    ...shadows.none,
    elevation: 0,
    zIndex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: space[10],
    height: space[1],
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: space[2],
  },
  body: {
    gap: space[2],
    flexGrow: 1,
  },
  bodyStatic: {
    gap: space[3],
    alignSelf: 'stretch',
  },
});
