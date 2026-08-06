// Split from withdraw.ts so the pure latest-row-wins logic stays importable via `tsx` without
// pulling in @insforge/sdk (lib/consent/withdraw.test.ts depends on that). No `server-only`
// import: it isn't a declared dependency in this project (only resolves under Next's webpack
// build) — lib/insforge-admin.ts's own runtime `typeof window` guard is what actually protects
// the service key, and this module is downstream of it.
import { insforgeAdmin } from '@/lib/insforge-admin';
import { currentStatus, type ConsentRow } from './withdraw';

function getAdminClient() {
  if (!insforgeAdmin) {
    throw new Error('Service key not configured');
  }
  return insforgeAdmin;
}

// user_id is null on any consent row written before app/api/auth/verify/route.ts's backfill ran
// (insforge/migrations/063_consent_records.sql) — matching on user_id alone misses those rows, so
// both branches are queried and merged in JS rather than attempted as a single OR filter (the SDK
// filter surface for a nested user_id.is.null + email.eq combinator is unverified against this SDK).
export async function fetchConsentRows(userId: string, email: string): Promise<ConsentRow[]> {
  const db = getAdminClient();
  const [byUser, byEmail] = await Promise.all([
    db.database.from('consent_records').select('purpose, status, created_at').eq('user_id', userId),
    db.database.from('consent_records').select('purpose, status, created_at').is('user_id', null).eq('email', email),
  ]);
  if (byUser.error) throw new Error(byUser.error.message);
  if (byEmail.error) throw new Error(byEmail.error.message);
  return [...(byUser.data || []), ...(byEmail.data || [])] as ConsentRow[];
}

// Guard for any future non-transactional/marketing sender. Verified live 2026-07-29: every
// notification_templates row (application_update, interview_scheduled, security_alert,
// export_ready, test_notification) and every app/api/email/send caller is transactional — nothing
// in this codebase currently sends marketing/recommendation email, so this guard has no live
// caller yet. Whoever builds that send path MUST call this first.
export async function marketingEmailAllowed(userId: string, email: string): Promise<boolean> {
  const rows = await fetchConsentRows(userId, email);
  return currentStatus(rows, 'marketing_email') === 'granted';
}
