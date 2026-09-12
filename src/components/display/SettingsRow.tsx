import type { ReactNode } from 'react';

import { ListRow } from './ListRow';

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function SettingsRow({
  title,
  subtitle,
  leading,
  value,
  onPress,
  toggleValue,
  onToggleChange,
  destructive,
  disabled,
  accessibilityLabel,
}: SettingsRowProps) {
  const isToggle = Boolean(onToggleChange);

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      leading={leading}
      value={value}
      chevron={!isToggle && Boolean(onPress)}
      toggleValue={toggleValue}
      onToggleChange={onToggleChange}
      destructive={destructive}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    />
  );
}
