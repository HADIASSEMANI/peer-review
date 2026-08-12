import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  testID?: string;
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-white border border-slate-300 active:bg-slate-50',
  ghost: 'bg-transparent active:bg-slate-100',
  danger: 'bg-blue-600 active:bg-blue-700',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-900',
  ghost: 'text-brand-600',
  danger: 'text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={[
        'flex-row items-center justify-center gap-2 rounded-xl px-4 h-12',
        CONTAINER[variant],
        fullWidth ? 'w-full' : '',
        inactive ? 'opacity-50' : '',
      ].join(' ')}
    >
      {loading ? <ActivityIndicator size="small" color={variant === 'secondary' ? '#111827' : '#ffffff'} /> : icon}
      <Text className={`text-base font-semibold ${LABEL[variant]}`}>{label}</Text>
      <View />
    </Pressable>
  );
}
