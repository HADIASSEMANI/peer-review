import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';

type Tone = 'blue' | 'green';

const TONES: Record<Tone, { from: string; to: string; solid: string }> = {
  blue: { from: '#2563eb', to: '#15aabf', solid: '#2563eb' },
  green: { from: '#40c057', to: '#15aabf', solid: '#40c057' },
};

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftSection?: ReactNode;
  testID?: string;
  height?: number;
}

export function GradientButton({
  label,
  onPress,
  tone = 'blue',
  disabled = false,
  loading = false,
  fullWidth = true,
  leftSection,
  testID,
  height = 48,
}: GradientButtonProps) {
  const inactive = disabled || loading;
  const c = TONES[tone];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={
        {
          backgroundColor: c.solid,
          backgroundImage: `linear-gradient(90deg, ${c.from}, ${c.to})`,
          opacity: inactive ? 0.6 : 1,
          height,
        } as ViewStyle
      }
      className={`flex-row items-center justify-center gap-2 rounded-xl px-4 ${
        fullWidth ? 'w-full' : 'self-center'
      }`}
    >
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : null}
      {!loading && leftSection ? <View>{leftSection}</View> : null}
      <Text className="text-center text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
