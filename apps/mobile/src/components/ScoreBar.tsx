import { RATING_MAX } from '@repo/types';
import { Text, View } from 'react-native';
import { score, scoreToWidth } from '../lib/format';

interface ScoreBarProps {
  label: string;
  value: number;
}

/** Horizontal meter for one dimension average, on the same 1-7 scale as input. */
export function ScoreBar({ label, value }: ScoreBarProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm text-ink-700">{label}</Text>
        <Text className="text-base text-ink-900">
          {score(value)}
          <Text className="text-xs font-normal text-ink-500"> / {RATING_MAX}</Text>
        </Text>
      </View>
      <View className="progress-track h-2 overflow-hidden rounded-full bg-slate-200">
        <View className="h-full rounded-full bg-brand-500" style={{ width: scoreToWidth(value) }} />
      </View>
    </View>
  );
}
