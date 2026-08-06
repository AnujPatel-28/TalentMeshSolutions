// W9: vitest unit tests for getServerUser() token-source and role-resolution behaviour
// (12_Admin_Production_Readiness_Execution_Plan.md §W9). Covers the two things that matter
// for authorization: (1) the token can only come from the tm_access_token cookie — there is
// no header fallback to defeat HttpOnly (A-1); (2) role always comes from profiles.role, never
// from a client-writable source (A-3), with a least-priv 'candidate' default.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { cookiesMock, getCurrentUserMock, singleMock, createClientMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  singleMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('@insforge/sdk', () => ({
  createClient: createClientMock,
}));

function makeCookieStore(token?: string) {
  return {
    get: (name: string) => (name === 'tm_access_token' && token ? { value: token } : undefined),
  };
}

describe('getServerUser', () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    getCurrentUserMock.mockReset();
    singleMock.mockReset();
    createClientMock.mockReset();

    createClientMock.mockReturnValue({
      auth: { getCurrentUser: getCurrentUserMock },
      database: {
        from: () => ({
          select: () => ({
            eq: () => ({ single: singleMock }),
          }),
        }),
      },
    });

    process.env.ALLOW_MOCK_AUTH = 'true';
    process.env.VERCEL_ENV = 'preview';
    process.env.E2E_MOCK_ADMIN_TOKEN = 'admin-tok';
    process.env.E2E_MOCK_CANDIDATE_TOKEN = 'cand-tok';
    process.env.NEXT_PUBLIC_INSFORGE_URL = 'https://example.invalid';
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'anon-key';
  });

  it('token-source: no tm_access_token cookie → null, no SDK call made', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore(undefined));
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('role-resolution: mock admin token short-circuits without touching the real SDK', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('admin-tok'));
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result?.role).toBe('admin');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('role-resolution: mock candidate token short-circuits the same way', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('cand-tok'));
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result?.role).toBe('candidate');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('real-token path: SDK auth error → null', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('real-user-token'));
    getCurrentUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result).toBeNull();
  });

  it('role-resolution: real token maps role from profiles table, not any other source', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('real-user-token'));
    getCurrentUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'staff@example.com' } },
      error: null,
    });
    singleMock.mockResolvedValue({ data: { role: 'super_admin', is_active: true } });
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result?.role).toBe('super_admin');
    expect(result?.is_active).toBe(true);
  });

  it('role-resolution: missing/null profile role defaults to candidate (least-priv, A-3)', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('real-user-token'));
    getCurrentUserMock.mockResolvedValue({
      data: { user: { id: 'u-2', email: 'noprofile@example.com' } },
      error: null,
    });
    singleMock.mockResolvedValue({ data: null });
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result?.role).toBe('candidate');
  });

  it('suspension: is_active === false is carried through, not silently dropped', async () => {
    cookiesMock.mockResolvedValue(makeCookieStore('real-user-token'));
    getCurrentUserMock.mockResolvedValue({
      data: { user: { id: 'u-3', email: 'suspended@example.com' } },
      error: null,
    });
    singleMock.mockResolvedValue({ data: { role: 'admin', is_active: false } });
    const { getServerUser } = await import('./server-auth');

    const result = await getServerUser();

    expect(result?.is_active).toBe(false);
  });
});
