import type { LoginInput, RegisterPayload } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

/**
 * Order matters in every one of these callbacks.
 *
 * Updating the auth store immediately swaps the navigation stack, which mounts
 * the dashboard and starts its queries. If the cache is cleared *after* that,
 * those in-flight queries are removed from the cache while their observers are
 * still subscribed — the observers then sit at `status: 'pending'` with
 * `isFetching: true` forever and no data ever arrives. It looks exactly like a
 * dead API, and only a full page reload recovers.
 *
 * So: always drop the previous session's cache BEFORE touching the store.
 */

export function useLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: async (auth) => {
      queryClient.clear();
      await signIn(auth);
    },
  });
}

export function useRegister() {
  const signIn = useAuthStore((s) => s.signIn);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterPayload) => api.register(input),
    onSuccess: async (auth) => {
      queryClient.clear();
      await signIn(auth);
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterPayload) => api.register(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  return async () => {
    queryClient.clear();
    await signOut();
  };
}
