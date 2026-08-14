import type {
  CreateTeamInput,
  UpdateTeamInput,
  CreateCourseInput,
  UpdateCourseInput,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export const useCourses = () =>
  useQuery({ queryKey: queryKeys.courses, queryFn: () => api.listCourses() });

export const useTeams = (courseId?: string) =>
  useQuery({ queryKey: queryKeys.teams(courseId), queryFn: () => api.listTeams(courseId) });

export const useTeam = (id: string) =>
  useQuery({ queryKey: queryKeys.team(id), queryFn: () => api.getTeam(id), enabled: Boolean(id) });

export const useStudents = (
  search?: string,
  organizationId?: string,
  scope?: 'mine' | 'all',
) =>
  useQuery({
    queryKey: [...queryKeys.students(search), organizationId ?? 'any', scope ?? 'all'],
    queryFn: () => api.listStudents(search, organizationId, scope),
  });

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) => api.createCourse(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCourseInput }) =>
      api.updateCourse(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses }),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCourse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
      // Teams and their summaries belonged to the deleted course; anything
      // still cached for it is now a 404 waiting to happen.
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Summary keys are ['evaluations', 'summary', ...] — invalidating at the
      // 'evaluations' prefix catches the course and team summaries alike.
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}

/**
 * Only fetched while a delete confirmation is open — `enabled` keeps it from
 * running on every dashboard render just to populate a dialog nobody opened.
 */
export const useCourseDeleteImpact = (id: string | null) =>
  useQuery({
    queryKey: ['course-delete-impact', id],
    queryFn: () => api.getCourseDeleteImpact(id as string),
    enabled: Boolean(id),
  });

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => api.createTeam(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTeamInput) => api.updateTeam(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.team(id) });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
