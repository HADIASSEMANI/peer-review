import { Pressable, Text, View } from 'react-native';

interface AlertProps {
  title: string;
  children: string;
  tone?: 'danger' | 'info';
  onClose?: () => void;
}

/** The old app's dismissible Mantine Alert (used for the confidentiality notice). */
export function Alert({ title, children, tone = 'danger', onClose }: AlertProps) {
  const palette =
    tone === 'danger'
      ? { box: 'border-slate-300 bg-slate-50', title: 'text-slate-800 swap-white-to-orange', body: 'text-slate-700 swap-white-to-orange' }
      : { box: 'border-primary/30 bg-primary-soft', title: 'text-primary', body: 'text-ink' };

  return (
    <View className={`flex-row gap-3 rounded-md border px-4 py-3 ${palette.box}`}>
      <View className="flex-1 gap-1">
        <Text className={`text-base ${palette.title}`}>{title}</Text>
        <Text className={`text-sm ${palette.body}`}>{children}</Text>
      </View>
      {onClose ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onClose}>
          <Text className="text-base text-ink">✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
