// W9: locks in the three-condition gate (W1) so a future edit can't silently reopen the
// mock-auth bypass (A-1). Pure function — no next/headers or SDK mocking needed.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveMockRole } from '@/lib/mock-auth';

const ORIGINAL_ENV = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('resolveMockRole (W1 three-condition gate)', () => {
  beforeEach(() => {
    setEnv({
      ALLOW_MOCK_AUTH: 'true',
      VERCEL_ENV: 'preview',
      E2E_MOCK_ADMIN_TOKEN: 'admin-tok',
      E2E_MOCK_CANDIDATE_TOKEN: 'cand-tok',
      E2E_MOCK_RECRUITER_TOKEN: 'rec-tok',
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns null with no token', () => {
    expect(resolveMockRole(null)).toBeNull();
    expect(resolveMockRole(undefined)).toBeNull();
    expect(resolveMockRole('')).toBeNull();
  });

  it('returns null when ALLOW_MOCK_AUTH is not exactly "true"', () => {
    setEnv({ ALLOW_MOCK_AUTH: undefined });
    expect(resolveMockRole('admin-tok')).toBeNull();

    setEnv({ ALLOW_MOCK_AUTH: 'TRUE' });
    expect(resolveMockRole('admin-tok')).toBeNull();
  });

  it('returns null in production regardless of flag or token — the exact A-1 regression', () => {
    setEnv({ VERCEL_ENV: 'production' });
    expect(resolveMockRole('admin-tok')).toBeNull();
    expect(resolveMockRole('cand-tok')).toBeNull();
    expect(resolveMockRole('rec-tok')).toBeNull();
  });

  it('resolves each role only when all three conditions hold', () => {
    expect(resolveMockRole('admin-tok')).toBe('admin');
    expect(resolveMockRole('cand-tok')).toBe('candidate');
    expect(resolveMockRole('rec-tok')).toBe('recruiter');
  });

  it('returns null for a token that matches no configured value — no hardcoded literal works', () => {
    expect(resolveMockRole('anything-else')).toBeNull();
  });

  it('returns null when the harness env var is unset even if someone guesses the default literal', () => {
    setEnv({ E2E_MOCK_ADMIN_TOKEN: undefined });
    expect(resolveMockRole('mock-admin-token')).toBeNull();
  });
});
