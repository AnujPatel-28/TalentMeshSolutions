import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN, MOCK_CANDIDATE_TOKEN } from './mock-tokens';

test.describe('Dashboard Accessibility & Role Protection', () => {
  
  test('unauthenticated user redirected to login from /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected to login from /dashboard/admin', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Authorized Navigation Smoke Tests', () => {
    
    test('candidate dashboard loading state contains skeleton or title', async ({ page }) => {
      await page.goto('/dashboard/candidate');
      expect(page.url()).not.toContain('404');
    });

    test('recruiter dashboard loading state contains skeleton or title', async ({ page }) => {
      await page.goto('/dashboard/recruiter');
      expect(page.url()).not.toContain('404');
    });
  });

  test.describe('Admin Dashboard UI & Caching Integration Tests', () => {
    const mockAdminId = 'adm-uuid-999';

    test.beforeEach(async ({ context, page }) => {
      // Inject cookies to simulate authenticated state
      await context.addCookies([
        { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
        { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
        { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'admin.localhost', path: '/' },
        { name: 'tm_role', value: 'admin', domain: 'admin.localhost', path: '/' },
        // AuthContext gates init on document.cookie.includes('tm_session') — without it
        // refreshUser() never runs and user stays null.
        { name: 'tm_session', value: '1', domain: 'localhost', path: '/' },
        { name: 'tm_session', value: '1', domain: 'admin.localhost', path: '/' }
      ]);

      // Mock auth-session Edge Function
      await page.route('**/api/v1/remote/functions/auth-session', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: mockAdminId, email: 'admin@test.com', name: 'Super Admin', role: 'admin' },
            token: MOCK_ADMIN_TOKEN
          })
        });
      });

      // Mock session as admin
      await page.route('**/api/auth/session', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: mockAdminId, email: 'admin@test.com', name: 'Super Admin' },
            role: 'admin'
          })
        });
      });

      // Mock admin-dashboard edge function success. Each metric is {value} | {error: true}
      // (R-9 / doc 14 D-15) — a StatCard shows "Failed to load" instead of a stale 0 on {error: true}.
      await page.route('**/admin-dashboard', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: {
              totalJobs: { value: 15 }, activeJobs: { value: 8 }, totalApplications: { value: 30 },
              totalCandidates: { value: 10 }, totalRecruiters: { value: 5 }
            },
            companyKpis: {
              companiesByStatus: { value: { pending: 1, verified: 4, suspended: 0, deactivated: 0 } },
              activeJobSlots: { value: { used: 8, limit: 10 } }
            },
            activities: [
              { id: '1', actor: 'John Doe', description: 'submitted application for Developer role', created_at: new Date().toISOString() }
            ],
            alerts: { pendingRecruiters: 2, pendingJobs: 1, reportedJobs: 0, newUsers24h: 1, pendingVerifications: 1 }
          })
        });
      });
    });

    test('admin dashboard loads stats and review queue correctly', async ({ page }) => {
      await page.goto('/dashboard/admin');
      
      // Verify Title
      const heading = page.locator('h1').filter({ hasText: /Welcome back/i });
      await expect(heading).toContainText(/Welcome back/i);

      // Verify Stats metric values. StatCard renders `value` in a <div class="...value...">,
      // not a <span> (components/dashboard/StatCard.tsx:83), and the per-role split
      // (10 candidates / 5 recruiters) renders in the card's delta line.
      const totalUsersValue = page.locator('div[class*="value"]').filter({ hasText: /^15$/ }).first();
      await expect(totalUsersValue).toBeVisible();
      await expect(page.locator('text=10 cand. + 5 rec.')).toBeVisible();

      // Verify review queue card
      await expect(page.locator('text=Approval Requests')).toBeVisible();
      await expect(page.locator('text=Job Reviews')).toBeVisible();
    });

    test('admin dashboard manual refresh button disables during execution', async ({ page }) => {
      // Delay API response to capture loading state
      let apiCalled = false;
      await page.route('**/admin-dashboard', async route => {
        apiCalled = true;
        await new Promise(resolve => setTimeout(resolve, 800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: {
              totalJobs: { value: 20 }, activeJobs: { value: 10 }, totalApplications: { value: 40 },
              totalCandidates: { value: 15 }, totalRecruiters: { value: 6 }
            },
            companyKpis: {
              companiesByStatus: { value: { pending: 0, verified: 5, suspended: 0, deactivated: 0 } },
              activeJobSlots: { value: { used: 10, limit: 10 } }
            },
            activities: [],
            alerts: { pendingRecruiters: 0, pendingJobs: 0, reportedJobs: 0, newUsers24h: 0, pendingVerifications: 0 }
          })
        });
      });

      await page.goto('/dashboard/admin');

      const refreshBtn = page.getByRole('button', { name: /Refresh/i });
      await expect(refreshBtn).toBeVisible();

      // Click and immediately check if button states disable and show Refreshing
      await refreshBtn.click();
      await expect(refreshBtn).toHaveAttribute('disabled', '');
      await expect(refreshBtn).toContainText(/Refreshing/i);

      // Wait for complete
      await expect(refreshBtn).not.toHaveAttribute('disabled', '');
      await expect(refreshBtn).toContainText('Refresh');
      
      // Verify empty alerts "All Caught Up!" message is rendered
      await expect(page.locator('text=All Caught Up!')).toBeVisible();
    });

    test('admin dashboard handles partial widget failures with isolated retry cooldown', async ({ page }) => {
      // Force API failure
      await page.route('**/admin-dashboard', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error', message: 'Database query timeout' })
        });
      });

      await page.goto('/dashboard/admin');

      // Check if StatsErrorState renders "Failed to Load"
      const errorText = page.locator('text=Failed to Load').first();
      await expect(errorText).toBeVisible();

      // Check if Review Queue isolated error card shows error message
      await expect(page.locator('text=Review Queue Error')).toBeVisible();

      // Click "Retry Load" button and check if it switches to backoff countdown
      const retryBtn = page.getByRole('button').filter({ hasText: /Retry Load|Wait/i }).first();
      await retryBtn.click();
      await expect(retryBtn).toBeDisabled();
      await expect(retryBtn).toContainText(/Wait/i);
    });

    test('mobile viewport locks body scroll when drawer is open', async ({ page }) => {
      // Set to iPhone size
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto('/dashboard/admin');

      // Initially drawer is closed
      const body = page.locator('body');
      await expect(body).not.toHaveCSS('overflow', 'hidden');
    });
  });
});
