import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

// Doc 14 R-6 — mirrors lib/validation/company.ts's GSTIN/PAN patterns (same regex, duplicated
// here because edge functions are a separate Deno deploy unit and cannot import Next.js app
// code). CIN intentionally does NOT reuse lib/validation/company.ts's CIN regex: that one is
// `^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$` (missing the foreign-company `F`
// prefix, and inconsistently allows a stray lowercase `u`). Doc 14 R-6 specifies the correct
// MCA21 pattern below and says to reproduce it exactly — flagged as a pre-existing drift in the
// recruiter-side schema, not fixed here (out of scope for this workstream).
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CIN_RE = /^[ULF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

const companyCreateSchema = z.object({
  name: z.string().min(2).max(120),
  gstin: z.string().regex(GSTIN_RE, 'Invalid GSTIN'),
  cin: z.string().regex(CIN_RE, 'Invalid CIN').optional(),
  website: z.string().url().optional(),
  industry: z.string().max(80).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  location: z.string().max(120).optional(),
  country_code: z.string().length(2).default('IN'),
  logo_url: z.string().optional(),
  description: z.string().max(2000).optional(),
});

// D from FR-3 (doc 14 R-6): gstin/cin/status are NEVER editable via this generic PATCH.
// Status changes only through the dedicated lifecycle actions below.
const companyPatchSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    website: z.string().url().optional(),
    industry: z.string().max(80).optional(),
    size: z.string().max(20).optional(),
    location: z.string().max(120).optional(),
    description: z.string().max(2000).optional(),
    logo_url: z.string().optional(),
    country_code: z.string().length(2).optional(),
    reason: z.string().min(10).max(500),
  })
  .strict();

const lifecycleSchema = z.object({
  action: z.enum(['suspend', 'reinstate', 'deactivate']),
  id: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

// doc 04 §1 company lifecycle: verified<->suspended, verified/suspended->deactivated (terminal).
const LIFECYCLE_TRANSITIONS: Record<string, { from: string[]; to: string; auditAction: string }> = {
  suspend: { from: ['verified'], to: 'suspended', auditAction: 'company_suspended' },
  reinstate: { from: ['suspended'], to: 'verified', auditAction: 'company_reinstated' },
  deactivate: { from: ['verified', 'suspended'], to: 'deactivated', auditAction: 'company_deactivated' },
};

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db, userId } = auth;

  const idempotencyKey = request.headers.get('x-idempotency-key');

  try {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'companies', action: 'view' }, cors);
      if (denied) return denied;

      if (url.searchParams.get('action') === 'get-detail') {
        const id = url.searchParams.get('id');
        if (!id) return errorJson('invalid_request', 'ID required', 400, cors);

        const { data: company, error: companyError } = await db.database
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();
        if (companyError || !company) return errorJson('not_found', 'Company not found', 404, cors);

        const [membersRes, jobsRes, verificationRes, subRes, valRes, auditRes] = await Promise.all([
          db.database
            .from('company_members')
            .select('id, user_id, member_role, status, joined_at, profiles!company_members_user_id_fkey(name, email)')
            .eq('company_id', id)
            .order('created_at', { ascending: true }),
          db.database.from('jobs').select('status, approval_status').eq('company_id', id),
          db.database
            .from('company_verification_requests')
            .select('id, status, review_notes, kyc_documents, channel, created_at, decided_at')
            .eq('company_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
          db.database.from('subscriptions').select('plan, status').eq('company_id', id).in('status', ['trialing', 'active']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          db.database
            .from('verification_audit_log')
            .select('id, actor_id, action, from_state, to_state, metadata, created_at, request_id')
            .eq('company_id', id)
            .order('created_at', { ascending: false })
            .limit(30),
          db.database
            .from('audit_log')
            .select('id, actor_id, action, table_name, record_id, reason, metadata, created_at')
            .eq('on_behalf_of', id)
            .order('created_at', { ascending: false })
            .limit(30),
        ]);

        if (membersRes.error) throw membersRes.error;
        if (jobsRes.error) throw jobsRes.error;
        if (verificationRes.error) throw verificationRes.error;

        const members = (membersRes.data ?? []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          member_role: m.member_role,
          status: m.status,
          joined_at: m.joined_at,
          name: m.profiles?.name ?? null,
          email: m.profiles?.email ?? null,
        }));

        const byStatus: Record<string, number> = {};
        const byApproval: Record<string, number> = {};
        for (const j of jobsRes.data ?? []) {
          byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
          byApproval[j.approval_status] = (byApproval[j.approval_status] ?? 0) + 1;
        }
        const activeJobsUsed = byStatus['active'] ?? 0;

        let subscription: { plan: string; status: string; max_active_jobs: number } | null = null;
        if (subRes.data) {
          const { data: planRow } = await db.database
            .from('plan_limits')
            .select('max_active_jobs')
            .eq('plan', subRes.data.plan)
            .maybeSingle();
          subscription = {
            plan: subRes.data.plan,
            status: subRes.data.status,
            max_active_jobs: planRow?.max_active_jobs ?? 1,
          };
        }

        // Collect actor names for both audit trails in one round trip.
        const actorIds = [
          ...new Set([
            ...((valRes.data ?? []).map((r: any) => r.actor_id)),
            ...((auditRes.data ?? []).map((r: any) => r.actor_id)),
          ].filter(Boolean)),
        ];
        let actorMap: Record<string, { name: string; email: string }> = {};
        if (actorIds.length > 0) {
          const { data: actors } = await db.database.from('profiles').select('id, name, email').in('id', actorIds);
          for (const a of actors ?? []) actorMap[a.id] = { name: a.name, email: a.email };
        }

        return json(
          {
            company,
            members,
            jobs: { total: (jobsRes.data ?? []).length, byStatus, byApproval, activeJobsUsed },
            verification: verificationRes.data ?? [],
            subscription,
            auditLog: {
              verification: (valRes.data ?? []).map((r: any) => ({ ...r, actor: actorMap[r.actor_id] ?? null })),
              platform: (auditRes.data ?? []).map((r: any) => ({ ...r, actor: actorMap[r.actor_id] ?? null })),
            },
          },
          200,
          cors
        );
      }

      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 20);

      let query = db.database.from('companies').select('*', { count: 'exact' });

      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(`name.ilike.%${term}%,gstin.ilike.%${term}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      return json({ companies: data, total: count }, 200, cors);
    }

    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (request.method === 'POST') {
        const rawBody = await request.json();

        // Lifecycle actions (P0): suspend / reinstate / deactivate. Never via generic PATCH.
        if (rawBody?.action) {
          const denied = checkPermission(role, { resource: 'companies', action: 'edit' }, cors);
          if (denied) return denied;

          const parsed = lifecycleSchema.safeParse(rawBody);
          if (!parsed.success) {
            return errorJson('invalid_request', 'Invalid lifecycle request', 400, cors, parsed.error.flatten().fieldErrors);
          }
          const { action, id, reason } = parsed.data;
          const transition = LIFECYCLE_TRANSITIONS[action];

          const { data: existing, error: existingError } = await db.database
            .from('companies')
            .select('status')
            .eq('id', id)
            .single();
          if (existingError || !existing) return errorJson('not_found', 'Company not found', 404, cors);

          if (!transition.from.includes(existing.status)) {
            return errorJson(
              'invalid_transition',
              `Cannot ${action} a company with status "${existing.status}"`,
              409,
              cors
            );
          }

          const { data: updated, error: updateError } = await db.database
            .from('companies')
            .update({ status: transition.to })
            .eq('id', id)
            .select()
            .single();
          if (updateError) throw updateError;

          // deactivate cascades: close any open jobs (doc 04 §1). Member removal is NOT
          // performed here — guard_last_company_admin (051) has no escape for a company being
          // deactivated (only for company DELETE), so removing the last active admin's
          // membership row would always raise `last_admin` mid-cascade. Flagged in the R-6
          // report as a P1 follow-up requiring a migration to extend that trigger's escape
          // hatch; draft migration included, not applied.
          if (action === 'deactivate') {
            const { error: jobsError } = await db.database
              .from('jobs')
              .update({ status: 'closed' })
              .eq('company_id', id)
              .in('status', ['draft', 'active', 'paused']);
            if (jobsError) throw jobsError;
          }

          try {
            await db.database.from('verification_audit_log').insert([{
              company_id: id,
              actor_id: userId,
              action: transition.auditAction,
              from_state: existing.status,
              to_state: transition.to,
              metadata: { reason },
            }]);
          } catch (e) {
            console.warn('Failed to insert verification_audit_log entry:', e);
          }

          const resPayload = { company: updated };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        const denied = checkPermission(role, { resource: 'companies', action: 'edit' }, cors);
        if (denied) return denied;

        const parsed = companyCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
          return errorJson('invalid_request', 'Invalid company data', 400, cors, parsed.error.flatten().fieldErrors);
        }
        const { data: created, error } = await db.database
          .from('companies')
          .insert([{ ...parsed.data, created_by: userId }])
          .select()
          .single();

        if (error) {
          // companies_gstin_key unique violation (23505) — attach flow per doc 14 R-6.
          if (error.code === '23505' || /gstin/i.test(error.message ?? '')) {
            const { data: existing } = await db.database
              .from('companies')
              .select('id')
              .eq('gstin', parsed.data.gstin)
              .maybeSingle();
            return json(
              { error: 'A company with this GSTIN already exists', code: 'company_exists', existing_company_id: existing?.id ?? null },
              409,
              cors
            );
          }
          throw error;
        }

        // F-23.2 fix (a): staff-created companies enter the same audited verification
        // path as recruiter-created ones. Without this row the company can never be
        // approved (the queue reads company_verification_requests and no
        // pending->verified lifecycle transition exists). channel CHECK allows only
        // gmail_kyc | upload_portal; staff receive KYC documents over Gmail.
        const { error: cvrError } = await db.database
          .from('company_verification_requests')
          .insert([{
            company_id: created.id,
            submitted_by: userId,
            channel: 'gmail_kyc',
            status: 'submitted',
          }]);
        if (cvrError) {
          // Compensate: without the request row the company would be stranded at
          // pending forever (the exact F-23.2 dead end) — remove it and fail loudly.
          await db.database.from('companies').delete().eq('id', created.id);
          throw cvrError;
        }

        const resPayload = { company: created };
        await completeIdempotency(db, idempotencyKey, 201, resPayload);
        return json(resPayload, 201, cors);
      }

      if (request.method === 'PATCH') {
        const denied = checkPermission(role, { resource: 'companies', action: 'edit' }, cors);
        if (denied) return denied;

        const id = url.searchParams.get('id');
        if (!id) {
          return errorJson('invalid_request', 'ID required', 400, cors);
        }

        const rawBody = await request.json();
        const parsed = companyPatchSchema.safeParse(rawBody);
        if (!parsed.success) {
          return errorJson('invalid_request', 'Invalid PATCH body', 400, cors, parsed.error.flatten().fieldErrors);
        }
        const { reason, ...fields } = parsed.data;

        const { data, error } = await db.database
          .from('companies')
          .update(fields)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'company_updated',
            table_name: 'companies',
            record_id: id,
            on_behalf_of: id,
            reason,
            metadata: { fields: Object.keys(fields) },
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { company: data };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      }

      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    } catch (workError) {
      await releaseIdempotency(db, idempotencyKey);
      throw workError;
    }
  } catch (error) {
    return internalError(cors, error);
  }
}
