import { insforge } from '@/lib/insforge';

export const CandidatesApi = {
  update: async (userId: string, updates: any) => {
    try {
      const { data, error } = await insforge.database
        .from('profiles') // Assuming profiles or candidates table
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data, error: error?.message };
    } catch (e: any) {
      return { error: e.message || 'Unknown error' };
    }
  }
};
