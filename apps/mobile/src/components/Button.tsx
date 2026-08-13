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
  height?: number;
  testID?: string;
}

/**
 * Same capsule as GradientButton and ButtonGroup. `primary` and `danger` take
 * the raised accent capsule; `secondary` and `ghost` stay flat in the track, so
 * two buttons side by side read as a hierarchy without a second hue.
 */
const RAISED: Record<Variant, boolean> = {
  primary: true,
  danger: true,
  secondary: false,
  ghost: false,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  height = 44,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const raised = RAISED[variant];

  return (
    <View
      className={[
        'glass-group flex-row items-center rounded-full p-1',
        fullWidth ? 'w-full' : 'self-start',
      ].join(' ')}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={onPress}
        style={{ height }}
        className={[
          'glass-seg flex-1 flex-row items-center justify-center gap-2 rounded-full px-5',
          raised ? 'glass-seg-active' : '',
          inactive ? 'opacity-45' : '',
        ].join(' ')}
      >
        {loading ? <ActivityIndicator size="small" color="#0f172a" /> : icon}
        <Text className={`text-base ${raised ? 'text-ink-900' : 'text-slate-600'}`}>{label}</Text>
        <View />
      </Pressable>
    </View>
  );
}
