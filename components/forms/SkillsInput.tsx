'use client';

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { X, Sparkles } from 'lucide-react';
import { Combobox, SuggestionItem } from '../ui/Combobox';
import { useAutocomplete } from '@/lib/hooks/useAutocomplete';
import { AISuggestApi } from '@/lib/api/aiSuggest';

interface SkillsInputProps {
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
  label?: string;
}

const COMMON_SKILLS = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 
  'Python', 'Docker', 'Kubernetes', 'AWS', 'Tailwind CSS',
  'GraphQL', 'Rust', 'Redux', 'Zustand', 'Prisma', 'MongoDB'
];

export const SkillsInput: React.FC<SkillsInputProps> = ({ 
  selectedSkills, 
  onChange, 
  label = 'Professional Skills'
}) => {
  const fetchSkills = async (q: string): Promise<SuggestionItem[]> => {
    // 1. Get exact matches from static list
    const exactMatches: SuggestionItem[] = COMMON_SKILLS
      .filter(s => s.toLowerCase().includes(q.toLowerCase()))
      .map(s => ({ label: s, source: 'exact' }));

    // 2. Fetch AI suggestions in parallel (with its own internal debounce/timeout)
    // Pass current selection as context
    const aiResults = await AISuggestApi.getSuggestions(q, 'skill', selectedSkills);

    // 3. Merge and deduplicate
    const combined = [...exactMatches];
    aiResults.forEach(ai => {
      if (!combined.some(c => c.label.toLowerCase() === ai.label.toLowerCase())) {
        combined.push(ai);
      }
    });

    return combined;
  };

  const { 
    query, 
    setQuery, 
    suggestions, 
    isLoading, 
    clearSuggestions 
  } = useAutocomplete<SuggestionItem>({ 
    fetchFn: fetchSkills,
    debounceMs: 400 // Aligned with user request
  });

  const handleSelect = (item: SuggestionItem) => {
    if (!selectedSkills.includes(item.label)) {
      onChange([...selectedSkills, item.label]);
    }
    setQuery('');
    clearSuggestions();
  };

  const handleRemove = (skill: string) => {
    onChange(selectedSkills.filter(s => s !== skill));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Sparkles size={18} color="#2563eb" />
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          p: 2.5,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Selected Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {selectedSkills.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ py: 0.5, fontStyle: 'italic' }}>
              No skills added. Add skills to enable AI semantic matching.
            </Typography>
          )}
          {selectedSkills.map((skill) => (
            <Chip
              key={skill}
              label={skill}
              onDelete={() => handleRemove(skill)}
              deleteIcon={<X size={14} />}
              size="small"
              sx={{ 
                bgcolor: 'white', 
                border: '1px solid #e2e8f0',
                fontWeight: 700,
                color: 'text.primary',
                borderRadius: 2,
                '&:hover': { borderColor: '#3b82f6', bgcolor: '#f0f9ff' },
                '& .MuiChip-deleteIcon': { color: '#94a3b8', '&:hover': { color: '#ef4444' } }
              }}
            />
          ))}
        </Box>

        {/* Autocomplete Input */}
        <Combobox
          query={query}
          onQueryChange={setQuery}
          suggestions={suggestions.filter(s => !selectedSkills.includes(s.label))}
          isLoading={isLoading}
          onSelect={handleSelect}
          placeholder="Try 'Cloud' or 'Frontend' for AI suggestions..."
        />
      </Box>
    </Box>
  );
};
