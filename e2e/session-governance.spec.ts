import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN, MOCK_CANDIDATE_TOKEN } from './mock-tokens';

const getAdminSettingsUrl = (baseURL: string | undefined) => {
  const port = baseURL ? new URL(baseURL).port : '3000';
  return `http://admin.localhost:${port}/dashboard/admin/settings`;
};

test.describe('Session Governance & Cleanup E2E Tests', () => {
  test.describe.configure({ mode: 'serial' });
  const mockUserId = 'adm-uuid-999';

  test.beforeEach(async ({ context, page }) => {
    test.setTimeout(60000);

    // Forward browser console logs to Playwright terminal for debugging
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });

    // Inject cookies to simulate authenticated state across localhost subdomains
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'super_admin', domain: 'localhost', path: '/' },
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'admin.localhost', path: '/' },
      { name: 'tm_role', value: 'super_admin', domain: 'admin.localhost', path: '/' },
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: '.localhost', path: '/' },
      { name: 'tm_role', value: 'super_admin', domain: '.localhost', path: '/' },
      // AuthContext gates init on document.cookie.includes('tm_session') — without it
      // refreshUser() never runs and user stays null.
      { name: 'tm_session', value: '1', domain: 'localhost', path: '/' },
      { name: 'tm_session', value: '1', domain: 'admin.localhost', path: '/' },
      { name: 'tm_session', value: '1', domain: '.localhost', path: '/' }
    ]);

    // Use context-wide routing to ensure all new tabs (page2) inherit these mocks
    await context.route('**/api/v1/remote/functions/auth-session*', async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'GET') {
        if (url.includes('heartbeat=true')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Heartbeat registered.' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: { id: mockUserId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin', mfa_enabled: false },
              requiresMfa: false
            })
          });
        }
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Mock admin-settings Edge Function (GET) for both general settings and admins list
    await context.route('**/api/v1/remote/functions/admin-settings*', async route => {
      const url = route.request().url();
      if (url.includes('section=admins')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            admins: [
              { id: mockUserId, name: 'Super Admin', email: 'admin@test.com', role: 'super_admin', created_at: new Date().toISOString() }
            ]
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            general: {
              platformName: 'TalentMesh',
              supportEmail: 'support@talentmesh.ai',
              tagline: 'The Future of Professional Integration'
            },
            feature_flags: {
              candidateRegistration: true,
              recruiterRegistration: true,
              blogEnabled: true,
              messagingEnabled: true,
              aiMatching: true
            },
            maintenance: {
              enabled: false
            }
          })
        });
      }
    });

    // Mock user preferences
    await context.route('**/api/database/records/user_preferences*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: mockUserId, sidebar_preferences: { collapsed: false } }])
      });
    });

    // Mock profiles
    await context.route('**/*profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: mockUserId, role: 'super_admin' }])
      });
    });

    // Mock Next.js refresh proxy endpoint to bypass external auth server calls
    await context.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: MOCK_ADMIN_TOKEN,
          csrfToken: 'mock-csrf'
        })
      });
    });

    // Mock storage cleanup edge function
    await context.route('**/api/v1/remote/functions/cleanup-stale-resources', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Mock admin-dashboard edge function to prevent layouts from hitting actual backend
    await context.route('**/api/v1/remote/functions/admin-dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: { totalJobs: 15, totalApplications: 30, totalCandidates: 10, totalRecruiters: 5 },
          activities: [],
          alerts: { pendingRecruiters: 2, pendingJobs: 1, reportedJobs: 0, newUsers24h: 1 }
        })
      });
    });
  });

  test('Session Warning displays modal on inactivity and extends on user action', async ({ page, baseURL }) => {
    // Navigate to settings page
    await page.goto(getAdminSettingsUrl(baseURL));
    await page.waitForLoadState('networkidle');

    // Simulate session about to expire by updating localStorage
    await page.evaluate(() => {
      // Admin timeout: 120 mins (7,200,000ms) per AuthContext. Warns at last 60s
      // (7,140,000ms elapsed threshold). Must stay under 7,200,000ms or AuthContext's
      // staleness guard resets tm_last_active_time to now.
      const nearExpiryTime = Date.now() - 7_145_000;
      localStorage.setItem('tm_last_active_time', nearExpiryTime.toString());
    });

    // Wait for the warning modal to trigger
    await expect(page.locator('text=Inactivity Warning')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Keep Working')).toBeVisible();

    // Click "Keep Working" to extend the session
    await page.click('text=Keep Working');

    // Modal should be dismissed
    await expect(page.locator('text=Inactivity Warning')).not.toBeVisible();

    // Verify tm_last_active_time has been reset back to current timestamp
    const updatedActiveTime = await page.evaluate(() => {
      return parseInt(localStorage.getItem('tm_last_active_time') || '0');
    });
    expect(Date.now() - updatedActiveTime).toBeLessThan(5000);
  });

  test('Multi-tab session warning propagates and extends across pages', async ({ context, page, baseURL }) => {
    // Tab 1
    await page.goto(getAdminSettingsUrl(baseURL));
    await page.waitForLoadState('networkidle');

    // Tab 2
    const page2 = await context.newPage();
    // Forward Tab 2 logs too
    page2.on('console', msg => {
      console.log(`[TAB 2 CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    await page2.goto(getAdminSettingsUrl(baseURL));
    await page2.waitForLoadState('networkidle');

    // Expire Tab 1 session
    await page.evaluate(() => {
      const nearExpiryTime = Date.now() - 7_145_000;
      localStorage.setItem('tm_last_active_time', nearExpiryTime.toString());
    });

    // Both tabs should show the warning modal via BroadcastChannel sync
    await expect(page.locator('text=Inactivity Warning')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('text=Inactivity Warning')).toBeVisible({ timeout: 15000 });

    // Click "Keep Working" on Tab 1
    await page.click('text=Keep Working');

    // Modals in BOTH tabs should close
    await expect(page.locator('text=Inactivity Warning')).not.toBeVisible();
    await expect(page2.locator('text=Inactivity Warning')).not.toBeVisible();
  });

  test('Device Manager displays sessions and supports revocation', async ({ page, baseURL }) => {
    // Mock user_sessions select query and update queries
    await page.route('**/api/database/records/user_sessions*', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'sess-111',
              user_id: mockUserId,
              session_type: 'normal',
              session_name: 'Chrome • Windows',
              ip_hash: 'abc123hashvalue',
              user_agent: 'Mozilla/5.0 Chrome/120.0',
              country: 'United States',
              region: 'California',
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 1000000).toISOString(),
              revoked_at: null,
              last_active_at: new Date().toISOString()
            }
          ])
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.goto(getAdminSettingsUrl(baseURL));
    await page.waitForLoadState('networkidle');

    // Open Active Devices tab. The tab label is "Active Sessions & Devices"
    // (settings/page.tsx:469); "Active Devices" is not a substring of it, so the
    // old selector never matched.
    await page.click('text=Active Sessions & Devices');

    // Verify session metadata is loaded
    await expect(page.locator('text=Chrome • Windows')).toBeVisible();
    await expect(page.locator('text=California, United States')).toBeVisible();
    await expect(page.locator('text=Revoke')).toBeVisible();

    // Setup dialog handler to click accept on revocation prompt
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('revoke this session');
      await dialog.accept();
    });

    // Click Revoke
    await page.click('text=Revoke');
  });

  test('Quarantine Manager displays quarantined items and handles restoration', async ({ page, baseURL }) => {
    let isRestoring = false;

    // Stateful mock for storage_quarantine table queries
    await page.route('**/api/database/records/storage_quarantine*', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'quar-111',
              bucket_name: 'resumes',
              file_path: 'quarantined/test-resume.pdf',
              original_path: 'resumes/test-resume.pdf',
              quarantined_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              restore_requested_at: isRestoring ? new Date().toISOString() : null,
              restored_at: null,
              status: isRestoring ? 'restoring' : 'quarantined'
            }
          ])
        });
      } else if (method === 'PATCH') {
        isRestoring = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.goto(getAdminSettingsUrl(baseURL));
    await page.waitForLoadState('networkidle');

    // Open Quarantine Manager tab
    await page.click('text=Quarantine Manager');

    // Verify quarantined file details are visible
    await expect(page.locator('text=test-resume.pdf').first()).toBeVisible();
    await expect(page.locator('text=resumes').last()).toBeVisible();
    await expect(page.locator('text=quarantined').first()).toBeVisible();
    await expect(page.locator('text=Restore').first()).toBeVisible();
    await expect(page.locator('text=Purge').first()).toBeVisible();

    // Setup dialog handler to click accept on restore prompt
    page.on('dialog', async dialog => {
      expect(dialog.message().toLowerCase()).toContain('restor');
      await dialog.accept();
    });

    // Click Restore
    await page.click('text=Restore');

    // Verify it updates to restoring state
    await expect(page.locator('text=Restoring').last()).toBeVisible();
  });
});
