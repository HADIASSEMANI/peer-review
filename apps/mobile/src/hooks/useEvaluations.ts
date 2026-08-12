import type { SubmitEvaluationBatchInput } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export const useEvaluationTargets = (teamId: string) =>
  useQuery({
    queryKey: queryKeys.targets(teamId),
    queryFn: () => api.listEvaluationTargets(teamId),
    enabled: Boolean(teamId),
  });

export const useMyFeedback = (teamId?: string) =>
  useQuery({ queryKey: queryKeys.myFeedback(teamId), queryFn: () => api.myFeedback(teamId) });

export const useCourseSummary = (courseId: string) =>
  useQuery({
    queryKey: queryKeys.courseSummary(courseId),
    queryFn: () => api.courseSummary(courseId),
    enabled: Boolean(courseId),
  });

export const useTeamSummary = (teamId: string) =>
  useQuery({
    queryKey: queryKeys.teamSummary(teamId),
    queryFn: () => api.teamSummary(teamId),
    enabled: Boolean(teamId),
  });

export function useSubmitEvaluations(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitEvaluationBatchInput) => api.submitEvaluations(input),
    onSuccess: () => {
      // Targets flip to "submitted" and the student's own averages change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.targets(teamId) });
      void queryClient.invalidateQueries({ queryKey: ['evaluations', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['evaluations', 'summary'] });
    },
  });
}
