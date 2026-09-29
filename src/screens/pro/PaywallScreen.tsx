import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, IconButton, Screen, Text } from '@/components';
import { FOXIEM_LOGO } from '@/constants/brand';
import { EXTERNAL_LINKS, termsUrl } from '@/constants/links';
import { trackEvent } from '@/lib/telemetry/analytics';
import type { RootScreenProps } from '@/navigation/types';
import { HIGHLIGHTED_PLAN, type ProPlan } from '@/pro/config';
import { PRO_FEATURES } from '@/pro/features';
import { usePro } from '@/pro/ProProvider';
import type { ProOffering } from '@/pro/purchaseAdapter';
import { useTheme } from '@/theme';
import { openExternalUrl } from '@/utils/externalLinks';

const SECTIONS = [
  { key: 'patterns', icon: 'pulse-outline' },
  { key: 'intelligence', icon: 'speedometer-outline' },
  { key: 'reminders', icon: 'notifications-outline' },
  { key: 'story', icon: 'calendar-outline' },
] as const;

type Message = { tone: 'neutral' | 'danger'; text: string } | null;

export function PaywallScreen({ navigation, route }: RootScreenProps<'Paywall'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pro = usePro();
  const feature = route.params?.feature;
  const [plan, setPlan] = useState<ProPlan>(HIGHLIGHTED_PLAN);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [success, setSuccess] = useState(false);
  const { loadOfferings } = pro;

  useEffect(() => {
    void loadOfferings();
    void trackEvent('paywall_viewed', { feature: feature ?? 'settings' });
  }, [feature, loadOfferings]);

  const store = Platform.OS === 'ios' ? t('pro.appStore') : t('pro.googlePlay');
  const offerings = pro.offerings.status === 'ready' ? pro.offerings.offerings : [];
  const selected = offerings.find((offering) => offering.plan === plan) ?? null;

  const buy = async () => {
    if (!selected || busy) {
      return;
    }
    setBusy('purchase');
    setMessage(null);
    const outcome = await pro.purchase(selected.plan);
    setBusy(null);
    if (outcome.status === 'success') {
      setSuccess(true);
    } else if (outcome.status === 'pending') {
      setMessage({ tone: 'neutral', text: t('pro.purchasePending') });
    } else if (outcome.status === 'failed') {
      setMessage({ tone: 'danger', text: t('pro.purchaseFailed') });
    }
  };

  const restore = async () => {
    if (busy) {
      return;
    }
    setBusy('restore');
    setMessage(null);
    const outcome = await pro.restore();
    setBusy(null);
    if (outcome.status === 'restored') {
      setSuccess(true);
    } else if (outcome.status === 'nothingToRestore') {
      setMessage({ tone: 'neutral', text: t('pro.nothingToRestore') });
    } else {
      setMessage({ tone: 'danger', text: t('pro.restoreFailed') });
    }
  };

  const finish = () => {
    // Land on the feature the user asked for; in-place features unlock on the screen underneath.
    if (feature === 'weeklyReview') {
      navigation.replace('WeeklyReview');
    } else if (feature === 'monthlyReview') {
      navigation.replace('MonthlyReview');
    } else {
      navigation.goBack();
    }
  };

  if (success || (pro.isPro && !busy)) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']} footer={<Button testID="paywall-done" title={t('common.done')} onPress={finish} />}>
        <View style={styles.success}>
          <Image source={FOXIEM_LOGO} style={styles.logo} accessibilityIgnoresInvertColors accessible={false} />
          <Text variant="title" align="center" accessibilityRole="header">
            {t('pro.welcomeTitle')}
          </Text>
          <Text variant="body" tone="inkSecondary" align="center" style={styles.successBody}>
            {t('pro.welcomeBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        pro.available ? (
          <View style={styles.footer}>
            <Button
              testID="paywall-buy"
              title={selected ? t('pro.cta', { price: planPrice(selected, t) }) : t('pro.loading')}
              disabled={!selected}
              loading={busy === 'purchase'}
              onPress={() => void buy()}
            />
            <Button
              testID="paywall-restore"
              title={t('pro.restore')}
              variant="ghost"
              compact
              loading={busy === 'restore'}
              onPress={() => void restore()}
            />
          </View>
        ) : null
      }
    >
      <View style={styles.closeRow}>
        <IconButton testID="paywall-close" icon="close" accessibilityLabel={t('common.close')} onPress={() => navigation.goBack()} variant="outlined" />
      </View>
      <View style={styles.hero}>
        <Image source={FOXIEM_LOGO} style={styles.logoSmall} accessible={false} />
        <Text variant="label" tone="brandInk">
          {t('pro.name')}
        </Text>
        <Text variant="title" accessibilityRole="header" style={styles.headline}>
          {t('pro.headline')}
        </Text>
      </View>

      {feature ? (
        <View style={[styles.context, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
          <Ionicons name={PRO_FEATURES[feature].icon} size={22} color={theme.colors.ink} />
          <View style={styles.contextCopy}>
            <Text variant="bodyStrong">{t('pro.contextTitle', { feature: t(`pro.features.${feature}.title`) })}</Text>
            <Text variant="caption" tone="inkSecondary">
              {t(`pro.features.${feature}.body`)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sections}>
        {SECTIONS.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.sunken, borderRadius: theme.radius.sm }]}>
              <Ionicons name={section.icon} size={20} color={theme.colors.ink} />
            </View>
            <View style={styles.sectionCopy}>
              <Text variant="bodyStrong">{t(`pro.sections.${section.key}.title`)}</Text>
              <Text variant="caption" tone="inkSecondary">
                {t(`pro.sections.${section.key}.body`)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {pro.offerings.status === 'loading' || pro.offerings.status === 'idle' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.ink} />
          <Text variant="caption" tone="inkSecondary">
            {t('pro.loading')}
          </Text>
        </View>
      ) : null}
      {pro.offerings.status === 'error' ? (
        <View style={styles.loading}>
          <Text variant="body" tone="inkSecondary" align="center">
            {t('pro.loadFailed')}
          </Text>
          <Button title={t('common.retry')} variant="secondary" compact onPress={() => void pro.loadOfferings()} />
        </View>
      ) : null}

      <View accessibilityRole="radiogroup" style={styles.plans}>
        {offerings.map((offering) => (
          <PlanCard key={offering.plan} offering={offering} selected={offering.plan === plan} onSelect={() => setPlan(offering.plan)} />
        ))}
      </View>

      {message ? (
        <Text variant="body" tone={message.tone === 'danger' ? 'danger' : 'inkSecondary'} align="center" accessibilityLiveRegion="assertive" style={styles.message}>
          {message.text}
        </Text>
      ) : null}

      <Text variant="caption" tone="inkTertiary" align="center" style={styles.legal}>
        {t('pro.cancelAnytime', { store })}
      </Text>
      <View style={styles.links}>
        <Pressable accessibilityRole="link" onPress={() => void openExternalUrl(EXTERNAL_LINKS.privacyPolicy)} hitSlop={8} style={styles.link}>
          <Text variant="caption" tone="inkSecondary" style={styles.underline}>
            {t('pro.privacy')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void openExternalUrl(termsUrl())} hitSlop={8} style={styles.link}>
          <Text variant="caption" tone="inkSecondary" style={styles.underline}>
            {t('pro.terms')}
          </Text>
        </Pressable>
      </View>
      {pro.simulator ? (
        <Text variant="micro" tone="inkTertiary" align="center" style={styles.simulated}>
          {t('pro.simulated')}
        </Text>
      ) : null}
    </Screen>
  );
}

function planPrice(offering: ProOffering, t: ReturnType<typeof useTranslation>['t']): string {
  return offering.billing === 'year'
    ? t('pro.plans.yearlyPrice', { price: offering.price })
    : offering.billing === 'month'
      ? t('pro.plans.monthlyPrice', { price: offering.price })
      : t('pro.plans.lifetimePrice', { price: offering.price });
}

function PlanCard({ offering, selected, onSelect }: { offering: ProOffering; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const priceLine = planPrice(offering, t);
  const detail =
    offering.billing === 'year' && offering.pricePerMonth
      ? t('pro.plans.yearlyPerMonth', { price: offering.pricePerMonth })
      : offering.billing === 'once'
        ? t('pro.plans.lifetimeBody')
        : null;
  return (
    <Pressable
      testID={`plan-${offering.plan}`}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={[t(`pro.plans.${offering.plan}`), priceLine, detail].filter(Boolean).join(', ')}
      onPress={onSelect}
      style={[
        styles.plan,
        {
          borderRadius: theme.radius.lg,
          borderColor: selected ? theme.colors.ink : theme.colors.line,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.colors.ink} />
      <View style={styles.planCopy}>
        <View style={styles.planTitle}>
          <Text variant="bodyStrong">{t(`pro.plans.${offering.plan}`)}</Text>
          {offering.plan === HIGHLIGHTED_PLAN ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.improvementSoft, borderRadius: theme.radius.xs }]}>
              <Text variant="micro" tone="improvement">
                {t('pro.plans.bestValue')}
              </Text>
            </View>
          ) : null}
        </View>
        {detail ? (
          <Text variant="caption" tone="inkSecondary">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyStrong" style={styles.price}>
        {priceLine}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeRow: {
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  hero: {
    gap: 6,
  },
  logoSmall: {
    width: 56,
    height: 56,
    marginBottom: 6,
  },
  headline: {
    fontSize: 30,
    lineHeight: 35,
  },
  context: {
    marginTop: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contextCopy: {
    flex: 1,
    gap: 2,
  },
  sections: {
    marginTop: 20,
    gap: 14,
  },
  section: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  loading: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  plans: {
    marginTop: 24,
    gap: 10,
  },
  plan: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  planTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  price: {
    maxWidth: '40%',
    textAlign: 'right',
  },
  message: {
    marginTop: 16,
  },
  legal: {
    marginTop: 20,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  simulated: {
    marginTop: 8,
  },
  footer: {
    gap: 2,
  },
  success: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  successBody: {
    marginTop: 10,
  },
});
