import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet, Text, TrackerIcon } from '@/components';
import { TRACKER_COLORS, TRACKER_ICONS, type TrackerColor } from '@/domain';
import { useTheme } from '@/theme';

type AppearanceFieldsProps = {
  icon: string;
  color: TrackerColor;
  onChange: (patch: { icon?: string; color?: TrackerColor }) => void;
};

export function ColorSwatches({ value, onChange }: { value: TrackerColor; onChange: (color: TrackerColor) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('create.colour')} style={styles.swatches}>
      {TRACKER_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={t('create.colourA11y', { colour: t(`colours.${color}`) })}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(color)}
            style={[styles.swatchHit, selected && { borderColor: theme.colors.ink }]}
          >
            <View style={[styles.swatch, { backgroundColor: theme.tone(color).solid }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Icon tile that opens a picker, plus colour swatches. */
export function AppearanceFields({ icon, color, onChange }: AppearanceFieldsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('create.chooseIcon')}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.iconButton,
            { borderRadius: theme.radius.md, borderColor: theme.colors.line, backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface },
          ]}
        >
          <TrackerIcon icon={icon} color={color} size={44} />
          <Text variant="label">{t('create.chooseIcon')}</Text>
        </Pressable>
      </View>
      <View style={styles.block}>
        <Text variant="label" tone="inkSecondary">
          {t('create.colour')}
        </Text>
        <ColorSwatches value={color} onChange={(next) => onChange({ color: next })} />
      </View>
      <Sheet visible={open} title={t('create.chooseIcon')} onClose={() => setOpen(false)}>
        <View style={styles.iconGrid}>
          {TRACKER_ICONS.map((name) => {
            const selected = name === icon;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={name.replace(/-outline$/, '').replace(/-/g, ' ')}
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange({ icon: name });
                  setOpen(false);
                }}
                style={[
                  styles.iconCell,
                  {
                    borderRadius: theme.radius.md,
                    backgroundColor: selected ? theme.tone(color).soft : theme.colors.sunken,
                    borderColor: selected ? theme.colors.ink : 'transparent',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={name as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={26}
                  color={selected ? theme.tone(color).ink : theme.colors.inkSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  block: {
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  swatchHit: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  iconCell: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
