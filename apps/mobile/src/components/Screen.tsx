import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

interface ScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, title, subtitle, refreshing = false, onRefresh }: ScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-4 py-5 gap-4 max-w-3xl w-full mx-auto"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      {title ? (
        <View className="gap-1">
          <Text className="text-2xl font-bold text-ink-900">{title}</Text>
          {subtitle ? <Text className="text-sm text-ink-500">{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-slate-50 py-16">
      <ActivityIndicator size="large" color="#2b55d4" />
      <Text className="text-sm text-ink-500">{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View className="items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10">
      <Text className="text-base font-semibold text-ink-900">{title}</Text>
      <Text className="text-center text-sm text-ink-500">{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
      <Text className="text-sm font-semibold text-blue-800">Something went wrong</Text>
      <Text className="text-sm text-blue-700">{message}</Text>
      {onRetry ? (
        <Text className="text-sm font-semibold text-blue-800 underline" onPress={onRetry}>
          Try again
        </Text>
      ) : null}
    </View>
  );
}
