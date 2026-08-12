import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@repo/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth/permission failures — they will not fix themselves.
        if (error instanceof ApiRequestError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  courses: ['courses'] as const,
  teams: (courseId?: string) => ['teams', courseId ?? 'all'] as const,
  team: (id: string) => ['team', id] as const,
  students: (search?: string) => ['students', search ?? ''] as const,
  targets: (teamId: string) => ['evaluations', 'targets', teamId] as const,
  myFeedback: (teamId?: string) => ['evaluations', 'me', teamId ?? 'all'] as const,
  courseSummary: (courseId: string) => ['evaluations', 'summary', 'course', courseId] as const,
  teamSummary: (teamId: string) => ['evaluations', 'summary', 'team', teamId] as const,
};
