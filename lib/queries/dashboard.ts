import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/insforge';
import { queryKeys } from './queryKeys';

export function useCandidateDashboardQuery(roleId: string, enabled: boolean) {
  return useQuery<any>({
    queryKey: queryKeys.dashboard(roleId),
    queryFn: async () => {
      const { data, error } = await invokeFunction('candidate-dashboard', {
        method: 'POST',
        body: { candidate_id: roleId },
      });
      if (error) {
        throw new Error(error.message || 'Failed to fetch candidate dashboard');
      }
      return data;
    },
    enabled: enabled && !!roleId,
  });
}
