// W9 — admin authorization regression suite (12_Admin_Production_Readiness_Execution_Plan.md).
// Every case here exercises the REAL server-side guard in app/dashboard/admin/layout.tsx →
// lib/server-auth.ts getServerUser() — no page.route interception of the guard itself, so a
// regression in the actual authorization code fails these tests, not a mock's assumptions.
//
// NOT covered here (documented gap, not silently dropped): edge-function-level enforcement
// (requireStaff's is_active/permission checks in insforge/functions/_shared/adminAuth.ts) is
// Deno-only and has no mock-auth path — it always hits the real backend. That is proven live
// against the susp_admin_* / admin_* fixtures the same way 0-W1__fable5.md's curl matrix did;
// it cannot be faked here without asserting a mocked response we wrote ourselves.
import { test, expect } from '@playwright/test';
import {
  MOCK_ADMIN_TOKEN,
  MOCK_CANDIDATE_TOKEN,
  MOCK_RECRUITER_TOKEN,
  MOCK_SUSPENDED_ADMIN_TOKEN,
} from './mock-tokens';

test.describe('Admin authorization guard (W9)', () => {
  test('unauthenticated → redirected to /login', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  // proxy.ts's isAdminPath block (line ~411) gates on the tm_role cookie BEFORE the request
  // ever reaches app/dashboard/admin/layout.tsx's getServerUser()-based check — despite the
  // file's own header comment claiming cookies are "routing metadata only" and
  // "all authorization is enforced by getServerUser() in layout RSCs". In practice the
  // middleware denies non-admins with a generic /unauthorized redirect first; the layout's
  // role-specific candidate/recruiter redirect (lines 20-26) never runs for a top-level
  // navigation. tm_role is HttpOnly and set only by /api/auth/session from the verified
  // profile (not client-forgeable), so this is a coverage/dead-code finding, not a security
  // hole — but it means the "friendly redirect to your own dashboard" behavior the layout
  // implements is currently unreachable. Tests below assert the ACTUAL behavior (generic
  // /unauthorized) so a future fix to either layer is a deliberate change, not a silent one.
  test('candidate role → denied at the proxy layer (generic /unauthorized, not the RSC redirect)', async ({ context, page }) => {
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_CANDIDATE_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'candidate', domain: 'localhost', path: '/' },
      { name: 'tm_onboarding', value: 'true', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('recruiter role → denied at the proxy layer (generic /unauthorized, not the RSC redirect)', async ({ context, page }) => {
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_RECRUITER_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'recruiter', domain: 'localhost', path: '/' },
      { name: 'tm_onboarding', value: 'true', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('suspended admin with a stale admin tm_role cookie still reaches the RSC and is bounced (A-2 backstop)', async ({ context, page }) => {
    // The proxy's cookie-based gate only checks role, not is_active — it cannot know the
    // account was suspended after the cookie was issued. This is exactly the scenario the RSC
    // layer (real getServerUser(), live is_active) exists to catch: the proxy admits the
    // request (role cookie says admin), and app/dashboard/admin/layout.tsx's own is_active
    // check is the thing that must fire.
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_SUSPENDED_ADMIN_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login\?reason=suspended/);
  });

  test('active admin → passes both the proxy gate and the RSC guard, reaches the dashboard', async ({ context, page }) => {
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  // R-14/W9 extension: 'admin' blocked from a super_admin-only permission-matrix action.
  // The spec's example (settings/team) is enforced only in the Deno edge function
  // (admin-settings, insforge/functions/_shared/permissions.ts) which has no mock-auth path —
  // same documented gap as the Live-backend-only block below. /api/admin/send-proposal is the
  // one route where the SAME matrix (lib/permissions.ts -> canPerform) is enforced by
  // lib/api/handler.ts's withApi at the Next.js layer, reachable with the existing mock admin
  // token: 'admin' passes allowedRoles but PERMISSIONS.admin.billing is ['view'] only, so
  // requiredPermission: {resource:'billing', action:'edit'} must 403 it.
  test("admin (not super_admin) blocked from a billing write by the permission matrix — real withApi enforcement", async ({ context }) => {
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    const res = await context.request.post('/api/admin/send-proposal', { data: {} });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('permission_denied');
  });

  test('a stale/forged admin role cookie with a garbage access token is still denied — RSC backstop', async ({ context, page }) => {
    // The nightmare case: an admin tm_role cookie without a token that actually resolves to
    // anyone (not one of the mock tokens, not a real session token). tm_role is HttpOnly and
    // server-derived so this specific combination shouldn't arise from a client-side attacker,
    // but if a cookie ever drifted (e.g. a copy-paste between browser profiles), the RSC layer
    // must still reject on the real getServerUser() call rather than trusting the role cookie.
    // Note: the resolveMockRole "denied in production regardless of a correct token" case (the
    // literal W1/A-1 regression) is locked in at the unit level in lib/mock-auth.test.ts — it
    // can't be exercised here because VERCEL_ENV is fixed for this whole shared webServer.
    await context.addCookies([
      { name: 'tm_access_token', value: 'not-a-real-or-mock-token', domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe.skip('Live-backend-only checks (not run in CI — see file header)', () => {
  test('suspended admin gets 403 from every admin-* edge function', async () => {
    // Run against a real backend with the susp_admin_* fixtures (present in prod per
    // docs/adminImplementation_outputToReview/1-052-applied__fable5.md). Mirrors the 9-case
    // curl matrix in 0-W1__fable5.md. Requires INSFORGE creds — not part of the mocked CI run.
  });

  test('admin (not super_admin) gets 403 from admin-settings team/settings actions', async () => {
    // Locks in W8/R-4's canPerform() enforcement at the edge-function boundary (unit-level
    // coverage already exists in __tests__/permissions-matrix.test.ts for the matrix itself;
    // this would prove the live admin-settings function actually calls it).
  });
});
