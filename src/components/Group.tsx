import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

/** One grouped surface; children are separated by inset hairlines. */
export function Group({ children, style, inset = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; inset?: number }) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg },
        style,
      ]}
    >
      {items.map((child, index) => (
        <Fragment key={child.key ?? index}>
          {index > 0 ? (
            <View style={[styles.separator, { marginLeft: inset || 16, backgroundColor: theme.colors.line }]} />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

export function Row({
  title,
  subtitle,
  value,
  leading,
  trailing,
  onPress,
  chevron,
  destructive = false,
  selected,
  disabled = false,
  switchValue,
  onSwitch,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: RowProps) {
  const theme = useTheme();
  const showChevron = chevron ?? (Boolean(onPress) && !onSwitch && selected === undefined);
  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');
  const main = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <Text variant="bodyStrong" tone={destructive ? 'danger' : 'ink'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="inkSecondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="inkSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {selected ? <Ionicons name="checkmark" size={22} color={theme.colors.ink} /> : null}
    </>
  );
  const toggle = onSwitch ? (
    <Switch
      value={Boolean(switchValue)}
      onValueChange={onSwitch}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? title}
      trackColor={{ false: theme.colors.lineStrong, true: theme.colors.improvement }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={theme.colors.lineStrong}
    />
  ) : null;
  const pressedStyle = ({ pressed }: { pressed: boolean }) => [pressed && { backgroundColor: theme.colors.sunken }];

  if (onPress && onSwitch) {
    // The switch stays outside the pressable so each has its own touch target and accessibility focus.
    return (
      <View testID={testID} style={[styles.split, disabled && styles.disabled]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={(state) => [styles.row, styles.splitMain, ...pressedStyle(state)]}
        >
          {main}
        </Pressable>
        <View style={styles.splitToggle}>{toggle}</View>
      </View>
    );
  }

  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {main}
      {toggle}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={theme.colors.inkTertiary} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessible={!onSwitch} accessibilityLabel={onSwitch ? undefined : accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={pressedStyle}
    >
      {content}
    </Pressable>
  );
}

export function Section({
  title,
  action,
  children,
  style,
  description,
}: {
  title?: string;
  action?: ReactNode;
  description?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text variant="heading" accessibilityRole="header" style={styles.sectionTitle}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {description ? (
        <Text variant="caption" tone="inkSecondary" style={{ marginBottom: theme.space[3] }}>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  value: {
    maxWidth: '45%',
  },
  disabled: {
    opacity: 0.45,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitMain: {
    flex: 1,
    paddingRight: 8,
  },
  splitToggle: {
    paddingRight: 16,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginBottom: 10,
  },
  sectionTitle: {
    flexShrink: 1,
  },
});
