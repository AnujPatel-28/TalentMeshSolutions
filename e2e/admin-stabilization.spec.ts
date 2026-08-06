import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN, MOCK_CANDIDATE_TOKEN } from './mock-tokens';

test.describe('Admin Stabilization E2E Tests', () => {
  const mockAdminId = 'adm-uuid-999';

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

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    page.on('request', req => console.log('REQ:', req.method(), req.url()));
    page.on('response', res => console.log('RES:', res.status(), res.url()));

    // Mock auth-session Edge Function
    await page.route(/\/api\/v1\/remote\/functions\/auth-session/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: mockAdminId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' },
          token: MOCK_ADMIN_TOKEN
        })
      });
    });

    // 1. Mock session as admin
    await page.route(/\/api\/auth\/session/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: mockAdminId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' },
          role: 'super_admin'
        })
      });
    });

    // Mock user_preferences table query
    await page.route('**/api/database/records/user_preferences*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: mockAdminId, sidebar_preferences: { collapsed: false } }])
      });
    });

    // Mock admin-dashboard Edge function response
    await page.route(/\/admin-dashboard/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: { candidates: 10, recruiters: 5, jobs: 8 },
          activities: []
        })
      });
    });

    // Mock token refresh endpoint
    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: MOCK_ADMIN_TOKEN,
          user: { id: mockAdminId, email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' }
        })
      });
    });

    // Mock logout endpoint
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // 2. Mock profiles table queries for RLS updates or bulk actions
    await page.route('**/*profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: mockAdminId, role: 'super_admin' }])
      });
    });

    // Mock export_jobs table inserts and updates (Correction 2: Worker Lock Recovery)
    await page.route('**/*export_jobs*', async route => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'mock-job-id-123', status: 'pending' })
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Mock export_job_items table inserts
    await page.route('**/*export_job_items*', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // Mock claim_export_job RPC
    await page.route('**/rpc/claim_export_job', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true)
      });
    });

    // Mock storage uploads and downloads for export candidates bucket
    await page.route('**/storage/v1/object/export-candidates/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'jobs/mock-job-id-123.csv' })
      });
    });

    await page.route('**/storage/v1/object/public/export-candidates/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'Name,Email,Location,Headline,Skills,Status,Active,Joined Date\nJane Doe,jane@doe.com,New York,Engineer,React,approved,Yes,2026-06-10'
      });
    });

    // 3. Mock admin-candidates Edge function response
    await page.route(/\/admin-candidates/, async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search') || '';
      
      let items = [
        {
          id: 'cand-1',
          name: 'John Doe',
          email: 'john@doe.com',
          location: 'New York',
          is_active: true,
          status: 'approved',
          created_at: new Date().toISOString(),
          candidate_profiles: [{ headline: 'Senior React Engineer', skills: ['React', 'TypeScript'] }]
        },
        {
          id: 'cand-2',
          name: 'Jane Smith',
          email: 'jane@smith.com',
          location: 'San Francisco',
          is_active: true,
          status: 'pending',
          created_at: new Date().toISOString(),
          candidate_profiles: [{ headline: 'Product Designer', skills: ['Figma', 'UI/UX'] }]
        }
      ];

      if (search === 'ManyCandidates') {
        const manyItems = [];
        for (let i = 1; i <= 105; i++) {
          manyItems.push({
            id: `cand-many-${i}`,
            name: `Candidate ${i}`,
            email: `candidate${i}@test.com`,
            location: 'Remote',
            is_active: true,
            status: 'approved',
            created_at: new Date().toISOString(),
            candidate_profiles: [{ headline: `Engineer ${i}`, skills: ['React'] }]
          });
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: manyItems,
            candidates: manyItems,
            total: manyItems.length,
            page: 0,
            hasMore: false
          })
        });
        return;
      }

      if (search === 'Nonexistent') {
        items = [];
      } else if (search && !'John Doe'.toLowerCase().includes(search.toLowerCase())) {
        items = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          candidates: items,
          total: items.length,
          page: 0,
          hasMore: false
        })
      });
    });

    // 4. Mock admin-recruiters Edge function response
    await page.route(/\/admin-recruiters/, async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search') || '';

      let items = [
        {
          id: 'rec-1',
          name: 'Alice Johnson',
          email: 'alice@google.com',
          is_active: true,
          created_at: new Date().toISOString(),
          recruiter_profiles: [
            {
              id: 'rec-1',
              company_name: 'Google',
              industry: 'Technology',
              company_size: '10000+',
              is_approved: true
            }
          ]
        }
      ];

      if (search === 'Nonexistent') {
        items = [];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          recruiters: items,
          total: items.length,
          page: 0,
          hasMore: false
        })
      });
    });
  });

  test('Candidate View: search state updates URL and persists across refresh and back navigation', async ({ page }) => {
    await page.goto('/dashboard/admin/candidates');

    // Wait for the candidates list to load
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Fill search input and submit
    const searchInput = page.locator('input[placeholder*="Search candidate by name"]');
    await searchInput.fill('John');
    await page.click('button[type="submit"]');

    // Verify URL parameter
    await expect(page).toHaveURL(/search=John/);

    // Refresh and check that search input still persists
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await expect(searchInput).toHaveValue('John');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Clear filters CTA when searching nonexistent
    await searchInput.fill('Nonexistent');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=No candidates found')).toBeVisible();

    // Click "Clear Search & Filters" CTA
    await page.waitForTimeout(1000);
    await page.click('text=Clear Search & Filters');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('Candidate View: bulk selection display confirms through BulkConfirmModal', async ({ page }) => {
    await page.goto('/dashboard/admin/candidates');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Check candidate checkboxes. The first checkbox on the page is the header
    // select-all (candidates/page.tsx:375), which selects every row — scope to tbody
    // so this clicks a single candidate row.
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();
    await checkboxes.first().click();

    // Verify floating bulk bar shows selected count
    const bulkBar = page.locator('div[class*="bulkBar"]');
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('1 candidates selected');

    // Trigger Bulk Deactivate Action
    await page.click('button:has-text("Deactivate")');

    // Verify confirmation modal displays selection info and impact warning
    const confirmModal = page.locator('text=Confirm Bulk Action');
    await expect(confirmModal).toBeVisible();
    await expect(page.locator('text=1 items selected')).toBeVisible();
    await expect(page.locator('text=Undo Support Info')).toBeVisible();

    // Close Modal
    await page.click('button:has-text("Cancel")');
    await expect(confirmModal).not.toBeVisible();
  });

  test('Recruiter View: search, invite, and bulk confirmation drawer triggers', async ({ page }) => {
    await page.goto('/dashboard/admin/recruiters');
    await expect(page.locator('text=Alice Johnson')).toBeVisible();

    // Check recruiter selection
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();
    await checkboxes.first().click();

    // Verify bulk bar
    const bulkBar = page.locator('div[class*="bulkBar"]');
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('1 recruiters selected');

    // Trigger deactivation bulk confirmation
    await page.click('button:has-text("Deactivate")');
    await expect(page.locator('text=Confirm Bulk Action')).toBeVisible();
    await expect(page.locator('text=This will suspend access for 1 recruiter(s).')).toBeVisible();
    await page.click('button:has-text("Cancel")');

    // Row-level empty state check
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await searchInput.fill('Nonexistent');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=No recruiters found')).toBeVisible();

    // Verify invite CTA works
    await page.click('text=Invite Recruiter');
    await expect(page.locator('text=Add Recruiter Account')).toBeVisible();
  });

  test('Mobile: viewport changes responsive grid display and shows selection layout', async ({ page }) => {
    // Set viewport to mobile standard 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/admin/candidates');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Check selection checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.first().click();

    // Ensure bulk actions bar floats fixed at bottom on mobile screen
    const bulkBar = page.locator('div[class*="bulkBar"]');
    await expect(bulkBar).toBeVisible();
    
    // Check style or fixed position characteristics
    const boundingBox = await bulkBar.boundingBox();
    expect(boundingBox).not.toBeNull();
  });

  test('Candidate View: queue export lifecycle & progress model updates (Correction 4)', async ({ page }) => {
    await page.goto('/dashboard/admin/candidates');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Search for ManyCandidates to load 105 mock records
    const searchInput = page.locator('input[placeholder*="Search candidate by name"]');
    await searchInput.fill('ManyCandidates');
    await page.click('button[type="submit"]');

    // Wait for the candidates grid to update and load Candidate 1
    await expect(page.locator('text="Candidate 1"').first()).toBeVisible();

    // Click Export CSV button
    await page.click('button:has-text("Export CSV")');

    // Verify background progress model (displays "Exporting X%")
    const progressBanner = page.locator('#export-progress-banner');
    await expect(progressBanner).toBeVisible();
    await expect(progressBanner).toContainText(/Exporting \d+%/);
  });

  test('Admin Pages: Undo survives page navigation (Correction 3)', async ({ page }) => {
    await page.goto('/dashboard/admin/candidates');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Select candidate John Doe
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();

    // Trigger Bulk Deactivate
    await page.click('button:has-text("Deactivate")');
    await expect(page.locator('text=Confirm Bulk Action')).toBeVisible();

    // Click Confirm
    await page.click('button:has-text("Confirm Deactivate")');

    // Verify 30s Undo Banner is visible
    const undoBanner = page.locator('text=Undo');
    await expect(undoBanner).toBeVisible();

    // Navigate to recruiters page
    await page.goto('/dashboard/admin/recruiters');
    await expect(page.locator('text=Alice Johnson')).toBeVisible();

    // Verify banner is gone on recruiters page
    await expect(undoBanner).not.toBeVisible();

    // Return to candidates page
    await page.goto('/dashboard/admin/candidates');
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Verify Undo banner is STILL visible and functional on return
    await expect(undoBanner).toBeVisible();

    // Click Undo
    await page.click('button:has-text("Undo")');

    // Verify Undo banner is dismissed
    await expect(undoBanner).not.toBeVisible();
  });
});
