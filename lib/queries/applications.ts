import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/insforge';
import { queryKeys } from './queryKeys';
import type { Application } from '@/types/user';

export function useCandidateApplicationsQuery(roleId: string, enabled: boolean) {
  return useQuery<Application[]>({
    queryKey: queryKeys.applications(roleId),
    queryFn: async () => {
      const { data, error } = await invokeFunction('candidate-applications', { method: 'GET' });
      if (error) {
        throw new Error(error.message || 'Failed to fetch candidate applications');
      }
      return data?.applications || [];
    },
    enabled: enabled && !!roleId,
  });
}

export function useWithdrawApplicationMutation(
  roleId: string,
  options?: {
    onMutate?: (id: string) => void | Promise<any>;
    onError?: (error: any, id: string, context: any) => void | Promise<any>;
    onSuccess?: (id: string, variables: string, context: any) => void | Promise<any>;
  }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await invokeFunction('candidate-applications-id', {
        method: 'PATCH',
        queries: { id },
        body: { status: 'withdrawn' }
      });
      if (error) {
        throw new Error(error.message || 'Failed to withdraw application');
      }
      return id;
    },
    onMutate: options?.onMutate,
    onError: options?.onError,
    onSuccess: async (id, variables, context) => {
      // Invalidate applications list
      queryClient.invalidateQueries({ queryKey: queryKeys.applications(roleId) });
      // Invalidate candidate dashboard stats count
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(roleId) });

      if (options?.onSuccess) {
        await options.onSuccess(id, variables, context);
      }
    }
  });
}

