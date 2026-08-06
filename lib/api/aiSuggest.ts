import { SuggestionItem } from '@/components/ui/Combobox';
import { invokeFunction } from '@/lib/insforge';

export const AISuggestApi = {
  getSuggestions: async (query: string, type: 'skill' | 'role' | 'industry', context?: string[]): Promise<SuggestionItem[]> => {
    try {
      const { data, error } = await invokeFunction('ai-match', {
        method: 'POST',
        body: { query, type, context }
      });
      
      if (error || !data || !Array.isArray(data.suggestions)) {
        return [];
      }
      
      return data.suggestions.map((s: string) => ({ label: s, source: 'ai' }));
    } catch (e) {
      console.error('AI suggest error:', e);
      return [];
    }
  }
};
