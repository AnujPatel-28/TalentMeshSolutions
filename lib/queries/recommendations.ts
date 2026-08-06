import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { invokeFunction, insforge } from '@/lib/insforge';
import { queryKeys } from './queryKeys';

export function useRecommendationsQuery(roleId: string, enabled: boolean) {
  return useQuery<any[]>({
    queryKey: queryKeys.recommendations(roleId),
    queryFn: async () => {
      try {
        const { data, error } = await invokeFunction('recommendations', {
          body: { candidate_id: roleId, limit: 6 },
        });

        const jobsList = data?.data || data;
        if (!error && jobsList && Array.isArray(jobsList) && jobsList.length > 0) {
          return jobsList;
        }
        
        // Fallback to active jobs
        const { data: fallbackJobs, error: fallbackError } = await insforge.database
          .from('jobs')
          .select('*, companies(name, logo_url)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);

        if (fallbackError) {
          throw new Error(fallbackError.message || 'Failed to fetch fallback job recommendations');
        }
        return fallbackJobs || [];
      } catch (err: any) {
        throw new Error(err.message || 'Error fetching recommendations');
      }
    },
    enabled: enabled && !!roleId,
    placeholderData: keepPreviousData,
  });
}
