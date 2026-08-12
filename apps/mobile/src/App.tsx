import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './lib/queryClient';
import { RootNavigator } from './navigation/RootNavigator';
import { useAuthStore } from './store/auth';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // Read the persisted session once on mount; RootNavigator waits for it.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
