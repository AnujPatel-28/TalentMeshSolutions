import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Candidate E2E Flow: Login -> Onboarding -> Resume Upload -> Job Application', () => {
  // Integration test, not a mocked E2E: it logs in with real credentials
  // (onboard_test_cand@example.com) against a live backend with seeded data.
  // Unskip when running against a seeded environment.
  test.skip('Complete onboarding and apply for a job', async ({ page, baseURL }) => {
    test.setTimeout(120000);
    // Register console and page error listeners
    page.on('console', msg => console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    page.on('request', request => console.log('>> REQUEST:', request.method(), request.url()));
    page.on('response', response => console.log('<< RESPONSE:', response.status(), response.url()));
    page.on('requestfailed', request => console.error('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText));

    // 0. Clear cookies to ensure test isolation
    await page.context().clearCookies();

    // 1. Go to Login Page
    const base = baseURL || 'http://localhost:3000';
    console.log(`Navigating to login page on ${base}...`);
    await page.goto(`${base}/login`);
    await expect(page).toHaveTitle(/Sign In/i);

    // 2. Fill login details
    console.log('Logging in as onboarding test candidate...');
    await page.fill('input[type="email"]', 'onboard_test_cand@example.com');
    await page.fill('input[type="password"]', 'StrongPassword123!');
    await page.click('button[type="submit"]');

    // 3. Wait for redirect to /onboarding/candidate
    console.log('Waiting for redirection to /onboarding/candidate...');
    await page.waitForURL(/\/onboarding\/candidate/, { timeout: 45000 });
    console.log('Successfully redirected to onboarding page!');

    // 4. STEP 1: Basic Info
    console.log('Step 1: Basic Info...');
    // Wait up to 30 seconds for the onboarding form's h1 to contain the text
    await expect(page.locator('h1')).toContainText('Basic Information', { timeout: 30000 });
    
    // Ensure name is set, or fill it
    const nameVal = await page.inputValue('input[placeholder="Your full name"]');
    if (!nameVal) {
      await page.fill('input[placeholder="Your full name"]', 'Onboarding Test Candidate');
    }
    await page.fill('input[placeholder="(555) 000-0000"]', '555-0199');
    
    // Type city and click it in the autocomplete list
    await page.fill('input[placeholder="Search city in India (e.g. Bengaluru, Mumbai)..."]', 'Bengaluru, Karnataka');
    await page.click('div.absolute >> text=Bengaluru, Karnataka');
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    console.log('Step 1 completed!');

    // Select Professional Domain (CustomSelect)
    await page.click('text=Select Professional Domain');
    await page.click('text=Engineering & Technology');
    
    // Fill Headline / Specialization (input with dynamic placeholder)
    await page.fill('input[placeholder="Search roles in Engineering & Technology..."]', 'Frontend Engineer');
    await page.click('div.absolute >> text=Frontend Engineer');
    
    // Add Skill
    await page.fill('input[placeholder="Search and add skills..."]', 'JavaScript');
    await page.click('form:has(input[placeholder="Search and add skills..."]) button:has-text("Add")');
    
    // Select Experience Level (CustomSelect)
    await page.click('text=Select experience level');
    await page.click('text=2 Years');
    
    // Highest Education Degree (CustomSelect)
    await page.click('text=Select highest degree');
    await page.click('text=B.Tech / B.E. (Bachelor of Technology / Engineering)');
    
    // Specialization / Field of Study (CustomSelect)
    await page.click('text=Select specialization');
    await page.click('text=Computer Science & Engineering');
    
    // College / University (CustomSelect)
    await page.click('text=Select college / university');
    await page.click('text=Bangalore University, Bengaluru');
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    console.log('Step 2 completed!');

    // 6. STEP 3: Preferences
    console.log('Step 3: Preferences...');
    
    // Salary Min (CustomSelect)
    await page.click('text=Select minimum');
    await page.click('text=₹6,00,000');
    
    // Salary Max (CustomSelect)
    await page.click('text=Select maximum');
    await page.click('text=₹10,00,000');
    
    // Add Preferred Location
    await page.fill('input[placeholder="Search and add preferred cities..."]', 'Bengaluru, Karnataka');
    await page.click('form:has(input[placeholder="Search and add preferred cities..."]) button:has-text("Add")');
    
    // Select Job Type
    await page.click('text=Select job type');
    await page.click('text=Remote');
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    console.log('Step 3 completed!');

    // 7. STEP 4: Documents (Resume Upload)
    console.log('Step 4: Documents (Resume Upload)...');
    
    // Set files directly on the hidden file input element
    console.log('Uploading resume PDF...');
    await page.setInputFiles('input[type="file"]', path.resolve('e2e/fixtures/dummy.pdf'));
    
    // Wait for simulated upload progress to complete (150ms * 5 steps + safety margin)
    await page.waitForTimeout(2000);
    console.log('File uploaded. Completing setup...');
    
    // Click Finish Setup
    await page.click('button:has-text("Finish Setup")');
    
    // 8. Redirect to dashboard
    console.log('Waiting for redirection to candidate dashboard...');
    await page.waitForURL(/candidate\/dashboard|dashboard\/candidate/, { timeout: 45000, waitUntil: 'commit' });
    await page.waitForSelector('h1:has-text("Welcome back")', { timeout: 30000 });
    console.log('Successfully onboarded and redirected to Candidate Dashboard!');

    // 9. Browse Jobs
    console.log('Navigating to browse-jobs...');
    const baseUri = new URL(base);
    const jobsUrl = `http://jobs.${baseUri.host}/browse-jobs`;
    console.log(`Dynamic jobs URL: ${jobsUrl}`);
    await page.goto(jobsUrl);
    
    // Wait for jobs to load
    await page.waitForSelector('text=Devops Engineer');
    console.log('Jobs list loaded successfully!');

    // 10. Click on Devops Engineer job
    console.log('Viewing Devops Engineer job details...');
    await page.click('text=Devops Engineer');
    
    // Wait for job details page
    await page.waitForSelector('button:has-text("Quick Apply")');
    
    // Click Apply
    console.log('Applying for Devops Engineer job...');
    await page.click('button:has-text("Quick Apply")');
    
    // Verify application success message
    await expect(page.locator('button:has-text("Applied")')).toBeVisible({ timeout: 15000 });
    console.log('Job application successfully created!');
  });
});
