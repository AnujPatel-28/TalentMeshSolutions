'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutocompleteOptions<T> {
  fetchFn: (query: string) => Promise<T[]>;
  debounceMs?: number;
  minChars?: number;
}

export function useAutocomplete<T>({
  fetchFn,
  debounceMs = 250,
  minChars = 2,
}: UseAutocompleteOptions<T>) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async (currentQuery: string) => {
    if (currentQuery.length < minChars) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchFn(currentQuery);
      setSuggestions(results);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, minChars]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions, debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    clearSuggestions,
  };
}
