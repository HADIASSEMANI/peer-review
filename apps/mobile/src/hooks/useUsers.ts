import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateUserInput } from '@repo/types';
import { api } from '../lib/api';

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      api.updateUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
