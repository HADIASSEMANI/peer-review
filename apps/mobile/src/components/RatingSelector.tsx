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
export function RatingSelector({
  label,
  description,
  value,
  onChange,
  error,
}: RatingSelectorProps) {
  return (
    <View className={`gap-2.5 ${error ? 'z-30' : ''}`}>
      {/* Wraps rather than shrinking: on a phone the descriptor chip would
          otherwise squeeze the label to one character per line. */}
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="min-w-[160px] flex-1">
          <Text className="text-base text-ink-900">{label}</Text>
          {description ? <Text className="mt-0.5 text-xs text-ink-500">{description}</Text> : null}
        </View>
        {value ? (
          <View className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 shadow-xs">
            <Text className="text-sm text-[#000000]">{DESCRIPTORS[value]}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-1 sm:gap-1.5">
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
                selected
                  ? 'liquid-glass-pill-active scale-105 shadow-md'
                  : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <Text className={selected ? 'text-lg text-[#000000]' : 'text-base text-slate-700'}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row justify-between px-0.5">
        <Text className="text-xs font-medium text-slate-500">1 (Low)</Text>
        <Text className="text-xs font-medium text-slate-500">4 (Average)</Text>
        <Text className="text-xs font-medium text-slate-500">7 (Exceptional)</Text>
      </View>

      {/* Floated, not reserved. `position: absolute` takes the message out of
          flow so an error cannot change the field's height or push the form
          around; it hovers just below the input instead. */}
      {error ? (
        <View
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 }}
          pointerEvents="none"
        >
          <View className="mt-1 self-start rounded-md border border-amber-200 bg-amber-50 px-2 py-1 shadow-sm">
            <Text className="text-sm text-amber-700">{error}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
