import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Tone = 'blue' | 'green' | 'ghost';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `blue` and `green` both render the accent capsule — kept as aliases so
   * existing call sites need no edit. `ghost` is the quiet variant.
   */
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  height?: number;
  testID?: string;
}

/**
 * A standalone action, built from the same track + capsule structure as
 * ButtonGroup so a lone button and a segmented pair are visually identical.
 * The glass treatment lives entirely in global.css; nothing here re-derives it.
 */
export function GradientButton({
  label,
  onPress,
  tone = 'green',
  disabled = false,
  loading = false,
  fullWidth = true,
  height = 48,
  testID,
}: GradientButtonProps) {
  const inactive = disabled || loading;
  const quiet = tone === 'ghost';

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
          quiet ? '' : 'glass-seg-active',
          inactive ? 'opacity-45' : '',
        ].join(' ')}
      >
        {loading ? <ActivityIndicator size="small" color="#0f172a" /> : null}
        <Text className={`text-base ${quiet ? 'text-slate-600' : 'text-ink-900'}`}>{label}</Text>
        <View />
      </Pressable>
    </View>
  );
}
