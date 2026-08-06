// Single gate for the e2e mock-auth identities. A mock session is minted ONLY when all
// three independent conditions hold:
//   (1) ALLOW_MOCK_AUTH === 'true'            — flag explicitly on (defaults off)
//   (2) VERCEL_ENV !== 'production'           — never on the production deployment
//   (3) token equals the harness-injected E2E_MOCK_*_TOKEN env value — unset ⇒ no match,
//       so there is no hardcoded token literal an attacker can send.
// Safe to import from shared client/server code: in the client bundle these env vars are
// undefined, so the gate is closed. See 12_Admin_Production_Readiness_Execution_Plan (W1).
export function resolveMockRole(
  token: string | null | undefined,
): 'admin' | 'candidate' | 'recruiter' | 'suspended_admin' | null {
  if (!token) return null;
  if (process.env.ALLOW_MOCK_AUTH !== 'true') return null;
  if (process.env.VERCEL_ENV === 'production') return null;

  const adminToken = process.env.E2E_MOCK_ADMIN_TOKEN;
  const candidateToken = process.env.E2E_MOCK_CANDIDATE_TOKEN;
  const recruiterToken = process.env.E2E_MOCK_RECRUITER_TOKEN;
  const suspendedAdminToken = process.env.E2E_MOCK_SUSPENDED_ADMIN_TOKEN;

  if (adminToken && token === adminToken) return 'admin';
  if (candidateToken && token === candidateToken) return 'candidate';
  if (recruiterToken && token === recruiterToken) return 'recruiter';
  if (suspendedAdminToken && token === suspendedAdminToken) return 'suspended_admin';

  return null;
}
