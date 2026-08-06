// R-4: locks the deliberate calls in doc 14 §4.2 so a matrix edit can't silently widen
// privilege, and proves lib/permissions.ts has not forked from the edge authority.
import { describe, it, expect } from 'vitest';
import { canPerform, isStaffRole, PERMISSIONS } from '@/lib/permissions';
import * as edge from '../insforge/functions/_shared/permissions';

describe('staff permission matrix', () => {
  it('lib/permissions.ts is the edge matrix, not a copy', () => {
    expect(PERMISSIONS).toBe(edge.PERMISSIONS);
  });

  it('non-staff roles are rejected', () => {
    expect(isStaffRole('recruiter')).toBe(false);
    expect(isStaffRole('candidate')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(canPerform('recruiter', 'jobs', 'view')).toBe(false);
  });

  it('admin is platform ops: no destructive PII, no team/settings, no billing writes', () => {
    expect(canPerform('admin', 'candidates', 'delete')).toBe(false);
    expect(canPerform('admin', 'companies', 'delete')).toBe(false);
    expect(canPerform('admin', 'team', 'view')).toBe(false);
    expect(canPerform('admin', 'settings', 'edit')).toBe(false);
    expect(canPerform('admin', 'billing', 'edit')).toBe(false);
    expect(canPerform('admin', 'audit_logs', 'export')).toBe(false);
    // ...but keeps job moderation
    expect(canPerform('admin', 'jobs', 'delete')).toBe(true);
    expect(canPerform('admin', 'verification', 'approve')).toBe(true);
  });

  it('content staff are confined to content view/edit', () => {
    expect(canPerform('content', 'content', 'edit')).toBe(true);
    expect(canPerform('content', 'content', 'approve')).toBe(false);
    expect(canPerform('content', 'content', 'delete')).toBe(false);
    expect(canPerform('content', 'candidates', 'view')).toBe(false);
    expect(canPerform('content', 'audit_logs', 'view')).toBe(false);
    expect(canPerform('content', 'recruiters', 'view')).toBe(false);
  });

  it('super_admin holds the destructive actions the others lost', () => {
    for (const perm of [
      ['candidates', 'delete'], ['companies', 'delete'], ['team', 'delete'],
      ['settings', 'edit'], ['billing', 'edit'], ['audit_logs', 'export'],
    ] as const) {
      expect(canPerform('super_admin', perm[0], perm[1])).toBe(true);
    }
  });
});
