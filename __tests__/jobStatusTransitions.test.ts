import { describe, it, expect } from 'vitest';
import { isValidJobStatusTransition } from '../insforge/functions/_shared/jobStatusTransitions';

describe('isValidJobStatusTransition (doc 04 §4 job lifecycle)', () => {
  it('allows the documented transitions', () => {
    expect(isValidJobStatusTransition('draft', 'active')).toBe(true);
    expect(isValidJobStatusTransition('active', 'paused')).toBe(true);
    expect(isValidJobStatusTransition('active', 'closed')).toBe(true);
    expect(isValidJobStatusTransition('paused', 'active')).toBe(true);
    expect(isValidJobStatusTransition('paused', 'closed')).toBe(true);
  });

  it('rejects no-op and undocumented transitions', () => {
    expect(isValidJobStatusTransition('active', 'active')).toBe(false);
    expect(isValidJobStatusTransition('draft', 'paused')).toBe(false);
    expect(isValidJobStatusTransition('draft', 'closed')).toBe(false);
    expect(isValidJobStatusTransition('closed', 'active')).toBe(false);
    expect(isValidJobStatusTransition('closed', 'draft')).toBe(false);
  });
});
