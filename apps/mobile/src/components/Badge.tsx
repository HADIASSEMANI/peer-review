import { Text, View } from 'react-native';

type Tone = 'neutral' | 'success' | 'warning' | 'brand';

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-ink-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  brand: 'bg-brand-100 text-brand-700',
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const [bg, fg] = TONE[tone].split(' ');
  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}
