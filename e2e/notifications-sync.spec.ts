import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN, MOCK_CANDIDATE_TOKEN } from './mock-tokens';

test.describe('Notification System & Real-Time Sync E2E Tests', () => {
  const mockUserId = 'adm-uuid-999';

  test.beforeEach(async ({ context, page }) => {
    test.setTimeout(60000);
    // Inject cookies to simulate authenticated state
    await context.addCookies([
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
      { name: 'tm_role', value: 'super_admin', domain: 'localhost', path: '/' },
      { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'admin.localhost', path: '/' },
      { name: 'tm_role', value: 'super_admin', domain: 'admin.localhost', path: '/' },
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
          user: { id: mockUserId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' },
          token: MOCK_ADMIN_TOKEN
        })
      });
    });

    // Mock session
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: mockUserId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' },
          role: 'super_admin'
        })
      });
    });

    // Mock user preferences
    await page.route('**/api/database/records/user_preferences*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: mockUserId, sidebar_preferences: { collapsed: false } }])
      });
    });

    // Mock profiles
    await page.route('**/*profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: mockUserId, role: 'super_admin' }])
      });
    });

    // Mock token refresh
    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: MOCK_ADMIN_TOKEN,
          user: { id: mockUserId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' }
        })
      });
    });

    // Mock notification_templates
    await page.route('**/remote/**/notification_templates*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'temp-1',
            key: 'application_update',
            title_template: 'Application Status Update: {{job}}',
            body_template: 'Hello {{candidate}}, your application status for {{job}} has been updated.',
            allowed_variables: ['candidate', 'job']
          }
        ])
      });
    });

    // Mock notification_jobs
    await page.route('**/remote/**/notification_jobs*', async route => {
      const method = route.request().method();
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'job-1', user_id: mockUserId, template_id: 'temp-1', channel: 'in_app', status: 'delivered', priority: 'normal', title: 'Hello', message: 'World', expires_at: new Date(Date.now() + 86400000).toISOString() }
          ])
        });
      }
    });

    // Mock notification_receipts
    await page.route('**/remote/**/notification_receipts*', async route => {
      const method = route.request().method();
      if (method === 'PATCH' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'rec-1', notification_job_id: 'job-1', user_id: mockUserId, read_at: null, clicked_at: null, dismissed_at: null }
          ])
        });
      }
    });

    // Mock notifications
    await page.route('**/remote/**/notifications*', async route => {
      const method = route.request().method();
      if (method === 'PATCH' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'notif-1',
              user_id: mockUserId,
              type: 'application_update',
              title: 'Application Status Update: Senior Developer',
              message: 'Hello Gauri, your application status for Senior Developer has been updated.',
              is_read: false,
              metadata: { job_id: 'job-1' },
              created_at: new Date().toISOString()
            }
          ])
        });
      }
    });

    // Mock notification-worker edge function
    await page.route('**/remote/functions/notification-worker', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Processed 1 notification job.' })
      });
    });
  });

  test('Should load NotificationCenter inbox tab by default', async ({ page }) => {
    await page.goto('/dashboard/admin/notifications');

    // Verify inbox headers are visible
    await expect(page.locator('text=Notifications').first()).toBeVisible();
    await expect(page.locator('text=Inbox').first()).toBeVisible();
    await expect(page.locator('text=Application Status Update: Senior Developer')).toBeVisible();
  });

  test('Should open Queue Monitor and run simulation triggers', async ({ page }) => {
    await page.goto('/dashboard/admin/notifications');

    // Click Queue Monitor tab
    await page.click('text=Queue Monitor');

    // Verify Dashboard Cards are rendered
    await expect(page.locator('text=Total Notification Jobs')).toBeVisible();
    await expect(page.locator('text=Delivery Success')).toBeVisible();
    await expect(page.locator('text=Opened / Open Rate')).toBeVisible();

    // Verify queue actions exist
    const workerBtn = page.locator('button:has-text("Run Worker")');
    await expect(workerBtn).toBeVisible();

    // Trigger worker run and check success toast message
    await workerBtn.click();
    await expect(page.locator('text=Processed 1 notification job.')).toBeVisible({ timeout: 15000 });
  });

  test('Should render live template previews with safe whitelisted variables', async ({ page }) => {
    await page.goto('/dashboard/admin/notifications');

    // Click Queue Monitor tab
    await page.click('text=Queue Monitor');

    // Locate preview inputs using explicit parent container labels
    const candidateInput = page.locator('div[class*="formGroup"]:has-text("candidate") input');
    const jobInput = page.locator('div[class*="formGroup"]:has-text("job") input');

    // Verify default seeded values inside live phone preview bubble
    const bubbleTitle = page.locator('div[class*="bubbleTitle"]');
    const bubbleBody = page.locator('div[class*="bubbleBody"]');

    await expect(bubbleTitle).toContainText('Application Status Update: Senior Full-Stack Developer');
    await expect(bubbleBody).toContainText('Hello Gauri, your application status for Senior Full-Stack Developer has been updated.');

    // Edit variables and verify rendering updates
    await candidateInput.fill('Alex');
    await jobInput.fill('Director of AI');

    await expect(bubbleTitle).toContainText('Application Status Update: Director of AI');
    await expect(bubbleBody).toContainText('Hello Alex, your application status for Director of AI has been updated.');
  });
});
