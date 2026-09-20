import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AdBanner } from '@/ads';
import { AppText, ConfirmDialog, ProgressRing, Screen } from '@/components';
import { FOXIEM_HOME_IMAGE, FOXIEM_LOGO, FOXIEM_PLUS_BUTTON } from '@/constants/brand';
import { useResponsiveLayout } from '@/hooks';
import type { MainTabScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { getTopicDisplayName } from '@/state/topics';
import { colors, fontFamily, radius, shadows, sizes, space } from '@/theme';
import { formatLocaleNumber } from '@/utils/number';

import { TopicSwitcher } from './TopicSwitcher';

const DEMO_GOAL = 300;
const HOME_MAX_WIDTH = 520;
const PLUS_BUTTON_ASPECT = 1271 / 442;

type Props = MainTabScreenProps<'HomeTab'>;
type QuickActionProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
};

function greetingKey(): 'home.goodMorning' | 'home.goodAfternoon' | 'home.goodEvening' {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'home.goodMorning';
  }
  if (hour < 18) {
    return 'home.goodAfternoon';
  }
  return 'home.goodEvening';
}

export function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { profile, counter, activeTopic, activeTopicId, incrementCounter, decrementCounter, resetCounter } =
    useAppState();
  const activeTopicName = getTopicDisplayName(activeTopic, (key) => t(key));
  const { isCompact, isLargePhone, height, width, horizontalPadding } = useResponsiveLayout();
  const isVeryShort = height < 560;
  const isShort = height < 700;

  const count = counter.currentCount;
  const [resetVisible, setResetVisible] = useState(false);

  const progress = useMemo(() => {
    if (DEMO_GOAL <= 0) {
      return 0;
    }

    return Math.min(count / DEMO_GOAL, 1);
  }, [activeTopicId, count]);

  const contentWidth = Math.min(HOME_MAX_WIDTH, width) - horizontalPadding * 2;
  const ringSize = isVeryShort ? 200 : isCompact || isShort ? 236 : isLargePhone ? 280 : 260;
  const countSize = isVeryShort ? 44 : isCompact || isShort ? 52 : 58;
  const illustrationHeight = isVeryShort ? 150 : isCompact || isShort ? 200 : isLargePhone ? 250 : 230;
  const plusButtonWidth = Math.min(width, HOME_MAX_WIDTH);
  const plusButtonHeight = Math.round(plusButtonWidth / PLUS_BUTTON_ASPECT);
  const plusOverflow = Math.max(0, (plusButtonWidth - contentWidth) / 2);
  const homeImageWidth = Math.min(width, HOME_MAX_WIDTH);
  const homeImageOverflow = Math.max(0, (homeImageWidth - contentWidth) / 2);
  const stageGap = isVeryShort ? space[2] : space[4];

  const increment = (amount: number) => {
    void incrementCounter(amount);
  };

  const decrement = () => {
    void decrementCounter(1);
  };

  return (
    <Screen
      scroll
      constrained
      maxWidth={HOME_MAX_WIDTH}
      backgroundColor={colors.background}
      edges={['top', 'left', 'right']}
      contentStyle={styles.screenFill}
      scrollContentStyle={styles.scrollFill}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <View style={styles.greeting}>
            <AppText variant="body" color="textSecondary" numberOfLines={1}>
              {t(greetingKey())}
            </AppText>
            <AppText variant="body" weight="600" numberOfLines={1} style={styles.name}>
              {profile?.name ?? ''}
            </AppText>
            <AppText variant="body" aria-label={t('home.wavingHand')}>
              👋
            </AppText>
          </View>
          <View style={styles.headerSide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.reminders')}
              onPress={() => navigation.navigate('Reminders')}
              style={({ pressed }) => [styles.logoChip, pressed && styles.logoChipPressed]}
            >
              <Image
                source={FOXIEM_LOGO}
                style={styles.logoImage}
                resizeMode="contain"
                accessible={false}
              />
            </Pressable>
          </View>
        </View>

        <AdBanner placement="home" compact />

        <View style={[styles.stage, { gap: stageGap }]}>
          <TopicSwitcher />
          <View style={styles.counterSection}>
            <ProgressRing
              progress={progress}
              size={ringSize}
              strokeWidth={7}
              trackColor={colors.border}
            >
              <View
                style={styles.counterContent}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${activeTopicName}, ${t('home.totalCount')}, ${formatLocaleNumber(count, i18n.language)}`}
              >
                <AppText
                  variant="displayNumber"
                  style={[
                    styles.countValue,
                    { fontSize: countSize, lineHeight: countSize + 6 },
                  ]}
                >
                  {formatLocaleNumber(count, i18n.language)}
                </AppText>
                <AppText variant="captionSmall" color="textSecondary" style={styles.countLabel}>
                  {t('home.totalCount')}
                </AppText>
              </View>
            </ProgressRing>
          </View>

          <View style={styles.mascotBlock}>
            <View
              style={[
                styles.illustrationContainer,
                {
                  width: homeImageWidth,
                  height: illustrationHeight,
                  marginHorizontal: -homeImageOverflow,
                  marginBottom: isVeryShort ? -space[3] : -space[5],
                },
              ]}
            >
              <Image
                source={FOXIEM_HOME_IMAGE}
                style={[
                  styles.illustration,
                  { width: homeImageWidth, height: illustrationHeight },
                ]}
                resizeMode="contain"
                accessible={false}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.addOne')}
              onPress={() => increment(1)}
              style={({ pressed }) => [
                styles.plusButton,
                {
                  width: plusButtonWidth,
                  marginHorizontal: -plusOverflow,
                },
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Image
                source={FOXIEM_PLUS_BUTTON}
                style={[
                  styles.plusButtonImage,
                  { width: plusButtonWidth, height: plusButtonHeight },
                ]}
                resizeMode="stretch"
                accessible={false}
              />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <QuickAction label="-1" accessibilityLabel={t('home.subtractOne')} onPress={decrement} />
            <QuickAction
              label={t('home.resetCounter')}
              icon="refresh-outline"
              accessibilityLabel={t('home.resetCounterA11y')}
              onPress={() => setResetVisible(true)}
            />
            <QuickAction label="+5" accessibilityLabel={t('home.addFive')} onPress={() => increment(5)} />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={resetVisible}
        title={t('home.resetTopicTitle', { topic: activeTopicName })}
        message={t('home.resetTopicMessage', { topic: activeTopicName })}
        confirmLabel={t('home.resetCounter')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onCancel={() => setResetVisible(false)}
        onConfirm={async () => {
          await resetCounter();
          setResetVisible(false);
        }}
      />
    </Screen>
  );
}

function QuickAction({ label, icon, onPress, accessibilityLabel }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        shadows.sm,
        pressed && styles.quickActionPressed,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={sizes.iconMd} color={colors.textPrimary} />
      ) : null}
      <AppText variant="label" color="textPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flexGrow: 1,
  },
  scrollFill: {
    flexGrow: 1,
    paddingBottom: space[4],
  },
  container: {
    flexGrow: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space[2],
  },
  headerSide: {
    width: sizes.controlMd,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: space[2],
  },
  name: {
    flexShrink: 1,
  },
  logoChip: {
    width: sizes.controlMd,
    height: sizes.controlMd,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoChipPressed: {
    opacity: 0.8,
  },
  logoImage: {
    width: sizes.iconXl,
    height: sizes.iconXl,
  },
  stage: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
  },
  counterSection: {
    alignItems: 'center',
    marginTop: space[4],
  },
  counterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: {
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  countLabel: {
    marginTop: space[1],
  },
  illustrationContainer: {
    overflow: 'visible',
    marginTop: -space[4],
    alignSelf: 'center',
    zIndex: 0,
  },
  illustration: {
    alignSelf: 'center',
  },
  mascotBlock: {
    width: '100%',
    alignItems: 'center',
  },
  plusButton: {
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  plusButtonImage: {
    width: '100%',
  },
  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  quickActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  quickAction: {
    flex: 1,
    minHeight: sizes.controlMd,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  quickActionPressed: {
    opacity: 0.75,
  },
});
