import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const PORT = process.env.PORT || 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
        launchOptions: {
          args: [
            '--host-resolver-rules=MAP admin.localhost 127.0.0.1,MAP jobs.localhost 127.0.0.1,MAP app.localhost 127.0.0.1',
          ],
        },
      },
    },
  ],

  // When E2E_MOCK_AUTH_OFF is set, the server is started externally WITHOUT ALLOW_MOCK_AUTH
  // (the security-mock-auth-off CI job) and Playwright must NOT manage its own mock-auth server.
  ...(process.env.E2E_MOCK_AUTH_OFF === '1'
    ? {}
    : {
        webServer: {
          command: 'npm run start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          // Enables the server-side mock-auth identities the e2e specs rely on. The flag must
          // NEVER be set in the real production deployment; the token values come from the
          // harness env (high-entropy in CI) and must match e2e/mock-tokens.ts. See W1.
          env: {
            ALLOW_MOCK_AUTH: 'true',
            E2E_MOCK_ADMIN_TOKEN: process.env.E2E_MOCK_ADMIN_TOKEN || 'mock-admin-token',
            E2E_MOCK_CANDIDATE_TOKEN: process.env.E2E_MOCK_CANDIDATE_TOKEN || 'fake-token',
            E2E_MOCK_RECRUITER_TOKEN: process.env.E2E_MOCK_RECRUITER_TOKEN || 'mock-recruiter-token',
            E2E_MOCK_SUSPENDED_ADMIN_TOKEN:
              process.env.E2E_MOCK_SUSPENDED_ADMIN_TOKEN || 'mock-suspended-admin-token',
          },
        },
      }),
});
