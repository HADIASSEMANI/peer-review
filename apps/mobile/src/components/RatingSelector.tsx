import { RATING_MAX, RATING_MIN } from '@repo/types';
import { Pressable, Text, View } from 'react-native';

interface RatingSelectorProps {
  label: string;
  description?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
}

const SCALE = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

const DESCRIPTORS: Record<number, string> = {
  1: '1 · Needs Improvement',
  2: '2 · Below Expectations',
  3: '3 · Developing',
  4: '4 · Competent',
  5: '5 · Very Good',
  6: '6 · Excellent',
  7: '7 · Exceptional',
};

/**
 * The 7-point scale used for every assessment dimension. Rendered as discrete
 * buttons with live descriptors and glass active states.
 */
export function RatingSelector({ label, description, value, onChange, error }: RatingSelectorProps) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-ink-900">{label}</Text>
          {description ? <Text className="mt-0.5 text-xs text-ink-500">{description}</Text> : null}
        </View>
        {value ? (
          <View className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 shadow-xs">
            <Text className="text-xs font-bold text-[#2563eb]">{DESCRIPTORS[value]}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-1.5">
        {SCALE.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${n} out of ${RATING_MAX}`}
              onPress={() => onChange(n)}
              className={[
                'h-11 flex-1 items-center justify-center rounded-xl transition-all shadow-xs',
                selected ? 'liquid-glass-pill-active scale-105 shadow-md' : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <Text className={selected ? 'text-base font-extrabold text-[#2563eb]' : 'text-sm font-semibold text-slate-700'}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row justify-between px-0.5">
        <Text className="text-xs font-medium text-slate-500">1 (Low)</Text>
        <Text className="text-xs font-medium text-slate-500">4 (Average)</Text>
        <Text className="text-xs font-medium text-slate-500">7 (Exceptional)</Text>
      </View>

      {error ? <Text className="text-xs font-medium text-blue-600">{error}</Text> : null}
    </View>
  );
}
