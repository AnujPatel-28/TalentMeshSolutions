import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to manage page-scoped selection state.
 * Automatically clears selected IDs when any item in the `deps` array changes.
 */
export function useSelection(deps: any[] = []) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Automatically clear selection when search/filters/pagination change
  useEffect(() => {
    setSelectedIds([]);
  }, deps);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
