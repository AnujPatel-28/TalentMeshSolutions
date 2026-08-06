// Mock-auth token values shared by the e2e specs. The defaults match the values
// playwright.config.ts injects into the webServer, so specs and server always agree.
// A hardened harness overrides both via env with high-entropy values (W1).
export const MOCK_ADMIN_TOKEN = process.env.E2E_MOCK_ADMIN_TOKEN || 'mock-admin-token';
export const MOCK_CANDIDATE_TOKEN = process.env.E2E_MOCK_CANDIDATE_TOKEN || 'fake-token';
export const MOCK_RECRUITER_TOKEN = process.env.E2E_MOCK_RECRUITER_TOKEN || 'mock-recruiter-token';
export const MOCK_SUSPENDED_ADMIN_TOKEN =
  process.env.E2E_MOCK_SUSPENDED_ADMIN_TOKEN || 'mock-suspended-admin-token';
