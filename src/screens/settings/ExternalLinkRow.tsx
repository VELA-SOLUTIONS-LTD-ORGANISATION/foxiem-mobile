import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, useToast } from '@/components';
import { space } from '@/theme';
import { isConfiguredExternalUrl, openExternalUrl } from '@/utils/externalLinks';

type ExternalLinkRowProps = {
  title: string;
  url: string;
  missingMessage: string;
};

export function ExternalLinkRow({ title, url, missingMessage }: ExternalLinkRowProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const configured = isConfiguredExternalUrl(url);

  if (!configured) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${title}. ${missingMessage}`}
        style={styles.row}
      >
        <AppText variant="body">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {missingMessage}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={() => {
        void (async () => {
          const opened = await openExternalUrl(url);
          if (!opened) {
            showToast({
              type: 'info',
              title: t('common.notConfigured'),
              message: missingMessage,
            });
          }
        })();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AppText variant="body" color="primary">
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space[1],
    paddingVertical: space[2],
  },
  pressed: {
    opacity: 0.7,
  },
});
