import { insforge } from '@/lib/insforge';
import { QueryFilter } from '@/types/filters';

export const SearchApi = {
  getSavedSearches: async (userId: string) => {
    try {
      const { data, error } = await insforge.database
        .from('saved_searches')
        .select('*')
        .eq('id', userId)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },
  
  saveSearch: async (userId: string, name: string, filters: QueryFilter) => {
    try {
      const { data, error } = await insforge.database
        .from('saved_searches')
        .insert({ user_id: userId, name, filters })
        .select()
        .single();
      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  deleteSavedSearch: async (id: string) => {
    try {
      const { error } = await insforge.database
        .from('saved_searches')
        .delete()
        .eq('id', id);
      return { error };
    } catch (e) {
      return { error: e };
    }
  }
};
