import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN, MOCK_CANDIDATE_TOKEN } from './mock-tokens';

test.describe('Authentication Flow', () => {
  test('should show error for invalid credentials', async ({ page }) => {
    // 1. Mock session as unauthenticated
    await page.route('**/api/auth/session', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify({ user: null }) });
      } else {
        route.continue();
      }
    });

    // 2. Mock auth failure
    await page.route('**/api/auth/sessions', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', message: 'Invalid credentials' })
      });
    });

    await page.goto('/login');
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    const error = page.getByTestId('login-error');
    await expect(error).toBeVisible({ timeout: 10000 });
    await expect(error).toContainText(/Invalid/i);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Mock session as 401
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
    });
    
    await page.goto('/dashboard/candidate/some-id');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('successful login and redirection (role: candidate)', async ({ page, baseURL }) => {
    page.on('console', msg => {
      console.log(`[AUTH TEST CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[AUTH TEST PAGEERROR] ${err.message}`);
    });

    const mockUserId = 'cand-uuid-123';
    
    // 1. Mock session as initially null
    let sessionUser: any = null;
    await page.route('**/api/auth/session', async route => {
      if (route.request().method() === 'POST') {
        // syncAuthCookies posts { token, role, adminAccess, onboardingComplete, ... } —
        // there is no `user` key in the payload (see AuthContext.syncAuthCookies).
        const body = JSON.parse(route.request().postData() || '{}');
        sessionUser = { id: mockUserId, role: body.role };
        // The real route replies with Set-Cookie; proxy.ts gates /candidate/* on
        // tm_access_token, so the mock must plant the same cookies or the post-login
        // navigation bounces straight back to /login?redirect=...
        // Chromium does not send Domain=.localhost cookies, so plant them per-host.
        await page.context().addCookies(['jobs.localhost', 'localhost'].flatMap(domain => [
          { name: 'tm_access_token', value: body.token, domain, path: '/' },
          { name: 'tm_session', value: '1', domain, path: '/' },
          { name: 'tm_role', value: body.role || 'candidate', domain, path: '/' },
          { name: 'tm_onboarding', value: 'true', domain, path: '/' }
        ]));
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ user: sessionUser }) });
      }
    });

    // 2. Mock Auth Success. The InsForge SDK's signInWithPassword POSTs to
    // /api/auth/sessions (verified against the live request) — not the Supabase-style
    // token?grant_type=password endpoint this mock previously targeted.
    await page.route('**/api/auth/sessions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: mockUserId, email: 'candidate@test.com' },
          accessToken: MOCK_CANDIDATE_TOKEN,
          refreshToken: 'mock-refresh-token'
        })
      });
    });

    // Client-side token rotation proxy hit by refreshAccessToken()
    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: MOCK_CANDIDATE_TOKEN })
      });
    });

    // Mock auth-session Edge Function for client-side session refresh
    await page.route('**/api/v1/remote/functions/auth-session*', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { 
              id: mockUserId, 
              email: 'candidate@test.com', 
              name: 'Test User', 
              role: 'candidate',
              completed_onboarding: true,
              onboarding_completed: true,
              onboarding_complete: true
            },
            token: MOCK_CANDIDATE_TOKEN
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // 3. Mock Profile API
    await page.route('**/*candidate_profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockUserId,
          email: 'candidate@test.com',
          role: 'candidate',
          name: 'Test User',
          completed_onboarding: true
        }),
      });
    });

    await page.route('**/*profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockUserId,
          email: 'candidate@test.com',
          role: 'candidate',
          name: 'Test User',
          completed_onboarding: true,
          onboarding_completed: true,
          onboarding_complete: true
        }),
      });
    });

    const loginUrl = baseURL ? baseURL.replace('://', '://jobs.') + '/login' : '/login';
    await page.goto(loginUrl);
    await page.fill('#email', 'candidate@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/candidate\/dashboard|dashboard\/candidate/, { timeout: 45000, waitUntil: 'commit' });
    await expect(page).toHaveURL(/candidate\/dashboard|dashboard\/candidate/);
  });
});
