import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/components';
import { FOXIEM_HOME_IMAGE } from '@/constants/brand';
import { useResponsiveLayout } from '@/hooks';
import type { RootScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme';

export function WelcomeScreen({ navigation }: RootScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { height, width } = useResponsiveLayout();
  const imageHeight = Math.min(Math.round(height * 0.3), 280, Math.round(width * 0.62));

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <View style={styles.footer}>
          <Button
            testID="welcome-start"
            title={t('welcome.cta')}
            style={styles.cta}
            onPress={() => navigation.navigate('Start')}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <Text variant="wordmark" align="center" style={{ color: theme.colors.brandInk }} accessibilityRole="header">
          Foxiem
        </Text>
        <View style={styles.hero}>
          <Image
            source={FOXIEM_HOME_IMAGE}
            style={{ width: '100%', height: imageHeight }}
            resizeMode="contain"
            accessible
            accessibilityLabel={t('welcome.foxAlt')}
          />
        </View>
        <Text variant="title" align="center" style={styles.title}>
          {t('welcome.title')}
        </Text>
        <Text variant="body" tone="inkSecondary" align="center" style={styles.copy}>
          {t('welcome.body')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Lifts the button off the bottom edge and makes it a touch taller and larger.
  footer: {
    paddingBottom: 28,
  },
  cta: {
    minHeight: 58,
    paddingVertical: 15,
  },
  body: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  hero: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  copy: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 26,
  },
});
