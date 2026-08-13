import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function Card({ children, title, subtitle, right, className = '' }: CardProps) {
  return (
    <View className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      {(title || right) && (
        <View className="mb-3 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            {title ? <Text className="text-lg text-ink-900">{title}</Text> : null}
            {subtitle ? <Text className="mt-0.5 text-sm text-ink-500">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}
