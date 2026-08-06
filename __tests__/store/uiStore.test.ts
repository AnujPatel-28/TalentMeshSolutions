import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/uiStore';

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.setState({
      activeFilters: {},
      sidebarOpen: false,
      selectedCandidateId: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.activeFilters).toEqual({});
    expect(state.sidebarOpen).toBe(false);
    expect(state.selectedCandidateId).toBeNull();
  });

  it('should toggle sidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('should force sidebar state', () => {
    useUIStore.getState().toggleSidebar(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    
    useUIStore.getState().toggleSidebar(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('should set and clear filters', () => {
    useUIStore.getState().setFilter('location', 'Remote');
    expect(useUIStore.getState().activeFilters).toEqual({ location: 'Remote' });
    
    useUIStore.getState().setFilter('salary', 100000);
    expect(useUIStore.getState().activeFilters).toEqual({ location: 'Remote', salary: 100000 });
    
    useUIStore.getState().clearFilters();
    expect(useUIStore.getState().activeFilters).toEqual({});
  });

  it('should set selected candidate ID', () => {
    useUIStore.getState().setSelectedCandidate('can_99');
    expect(useUIStore.getState().selectedCandidateId).toBe('can_99');
    
    useUIStore.getState().setSelectedCandidate(null);
    expect(useUIStore.getState().selectedCandidateId).toBeNull();
  });
});
