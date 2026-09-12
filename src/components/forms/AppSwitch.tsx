import { Switch } from 'react-native';

import { colors } from '@/theme';

type AppSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

export function AppSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AppSwitchProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, checked: value }}
      trackColor={{ false: colors.disabled, true: colors.primarySoft }}
      thumbColor={value ? colors.primary : colors.surface}
      ios_backgroundColor={colors.disabled}
    />
  );
}
