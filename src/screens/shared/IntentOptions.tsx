import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components';
import { TRACKER_INTENTS, type TrackerIntent } from '@/domain';
import { useTheme } from '@/theme';

export const INTENT_ICONS: Record<TrackerIntent, keyof typeof Ionicons.glyphMap> = {
  count: 'add-circle-outline',
  reach: 'flag-outline',
  limit: 'remove-circle-outline',
  reduce: 'trending-down-outline',
  consistency: 'repeat-outline',
};

/** The five ways a number can matter, in human words. */
export function IntentOptions({ value, onSelect }: { value: TrackerIntent | null; onSelect: (intent: TrackerIntent) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {TRACKER_INTENTS.map((intent) => {
        const selected = value === intent;
        return (
          <Pressable
            key={intent}
            testID={`intent-${intent}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`${t(`intents.${intent}.title`)}. ${t(`intents.${intent}.body`)}`}
            onPress={() => onSelect(intent)}
            style={({ pressed }) => [
              styles.option,
              {
                borderRadius: theme.radius.lg,
                backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
                borderColor: selected ? theme.colors.ink : theme.colors.line,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: theme.colors.sunken, borderRadius: theme.radius.sm }]}>
              <Ionicons name={INTENT_ICONS[intent]} size={22} color={theme.colors.ink} />
            </View>
            <View style={styles.copy}>
              <Text variant="bodyStrong">{t(`intents.${intent}.title`)}</Text>
              <Text variant="caption" tone="inkSecondary" style={styles.body}>
                {t(`intents.${intent}.body`)}
              </Text>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.ink} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  option: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    marginTop: 2,
  },
});
