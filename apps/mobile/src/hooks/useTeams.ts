import type { CreateTeamInput, UpdateTeamInput } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export const useCourses = () =>
  useQuery({ queryKey: queryKeys.courses, queryFn: () => api.listCourses() });

export const useTeams = (courseId?: string) =>
  useQuery({ queryKey: queryKeys.teams(courseId), queryFn: () => api.listTeams(courseId) });

export const useTeam = (id: string) =>
  useQuery({ queryKey: queryKeys.team(id), queryFn: () => api.getTeam(id), enabled: Boolean(id) });

export const useStudents = (search?: string) =>
  useQuery({ queryKey: queryKeys.students(search), queryFn: () => api.listStudents(search) });

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
