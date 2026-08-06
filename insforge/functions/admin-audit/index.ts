// TOMBSTONE — this function is retired (doc 03 §"Endpoints": `admin-audit` → **Deleted**).
//
// It was a POST-only writer into `audit_log` that took `actor_id`, `action`, `entity_type`,
// `entity_id` straight from the request body — `actor_id: actor_id || userId` meant a caller
// could attribute a ledger row to ANY user. An append-only audit log whose rows can be forged
// by their subject is worse than no audit log at all (doc 13 FR-7).
//
// Zero app callers: the audit UI (`app/dashboard/admin/audit-logs/page.tsx`) reads via
// `admin-audit-logs`. All legitimate audit writes are server-side, made by the acting function
// itself with a server-derived actor (R-3).
//
// The file is kept rather than deleted ON PURPOSE: `scripts/deploy-all-functions.js` only ever
// deploys on-disk directories — it has no delete path — so removing this directory would strand
// the old forgeable handler live and remove the evidence from the repo. This 410 stub is the
// deploy vehicle that neutralizes the live slug. Delete the directory only AFTER the live
// function is removed:  npx @insforge/cli functions delete admin-audit
import { corsHeaders } from '../_shared/cors.ts';
import { errorJson } from '../_shared/errors.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  return errorJson('gone', 'admin-audit is retired; audit rows are written server-side only', 410, cors);
}
