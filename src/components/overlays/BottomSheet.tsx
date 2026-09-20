import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/buttons/IconButton';
import { AppText } from '@/components/typography/AppText';
import { useResponsiveLayout } from '@/hooks';
import { colors, radius, shadows, sizes, space } from '@/theme';

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  compact?: boolean;
  showClose?: boolean;
  placement?: 'bottom' | 'top';
  onShow?: () => void;
};

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  header,
  scroll = true,
  keyboardAware = false,
  compact = false,
  showClose = false,
  placement = 'bottom',
  onShow,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height, horizontalPadding } = useResponsiveLayout();
  const isIOS = Platform.OS === 'ios';
  const fromTop = placement === 'top';
  const slide = useRef(new Animated.Value(fromTop ? -24 : 0)).current;

  useEffect(() => {
    if (!fromTop) {
      return;
    }
    slide.setValue(-32);
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fromTop, slide]);

  if (!visible) {
    return null;
  }

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardAware ? (isIOS ? 'interactive' : 'on-drag') : undefined}
      automaticallyAdjustKeyboardInsets={keyboardAware && isIOS && !fromTop}
      bounces={false}
      contentContainerStyle={compact ? styles.bodyCompact : styles.body}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.bodyStatic}>{children}</View>
  );

  const framed = (
    <View style={[styles.backdrop, fromTop && styles.backdropTop]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.closeSheet')}
        onPress={onClose}
        style={styles.backdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          compact && styles.sheetCompact,
          fromTop && styles.sheetTop,
          {
            maxHeight: height * 0.9,
            paddingHorizontal: horizontalPadding,
            paddingTop: fromTop ? Math.max(insets.top, space[4]) : space[3],
            paddingBottom: fromTop
              ? space[4]
              : Math.max(insets.bottom, compact ? space[4] : space[6]),
            transform: fromTop ? [{ translateY: slide }] : undefined,
          },
        ]}
      >
        {fromTop ? null : <View style={[styles.handle, compact && styles.handleCompact]} />}
        {header}
        {title ? (
          compact ? (
            <View style={styles.headerRow}>
              <AppText variant="h3" weight="700" numberOfLines={1} style={styles.headerTitle}>
                {title}
              </AppText>
              {showClose ? (
                <IconButton accessibilityLabel={t('common.closeSheet')} onPress={onClose}>
                  <Ionicons name="close" size={sizes.iconLg} color={colors.textSecondary} />
                </IconButton>
              ) : null}
            </View>
          ) : (
            <AppText variant="h3" align="center">
              {title}
            </AppText>
          )
        ) : null}
        {body}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType={fromTop ? 'fade' : 'slide'}
      onRequestClose={onClose}
      onShow={onShow}
    >
      {keyboardAware && isIOS && !fromTop ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {framed}
        </KeyboardAvoidingView>
      ) : (
        framed
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTop: {
    justifyContent: 'flex-start',
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
  handleCompact: {
    marginBottom: 0,
  },
  sheetTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    borderTopWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetCompact: {
    gap: space[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.touchMin,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    gap: space[2],
    flexGrow: 1,
  },
  bodyCompact: {
    gap: space[5],
    flexGrow: 0,
  },
  bodyStatic: {
    gap: space[3],
    alignSelf: 'stretch',
  },
});
