import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

// Doc 14 R-7 — replaces the legacy approve-setup/verify-otp/send-credentials/update-password
// pipeline (D-5/D-6/D-7). Recruiters are now directory rows on `profiles(role='recruiter')`
// joined to `company_members` (membership/lifecycle) and `companies` (tenant identity).
// Same GSTIN/CIN patterns as admin-companies (doc 14 R-6) — duplicated because edge functions
// are a separate Deno deploy unit and cannot import Next.js app code.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]{1}$/;
const CIN_RE = /^[ULF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

// R-7 (f): the ONLY PATCH-able recruiter-profile fields. `job_title`/`about` live on
// recruiter_profiles, `phone` lives on profiles — membership fields (role/status/company) are
// never settable here, only via the lifecycle actions on `/api/company/[companyId]/members/[userId]`.
const patchSchema = z
  .object({
    job_title: z.string().max(120).optional(),
    about: z.string().max(2000).optional(),
    phone: z.string().max(20).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to update' });

// R-7 (d): never returns the link/OTP — success only. Uses InsForge auth's built-in
// password-reset email (same primitive as the staff-invite flow, lib/admin/invite.ts) instead of
// minting a bespoke token table — the auth user id never changes, no plaintext password is ever
// generated or transmitted.
const resetLinkSchema = z.object({ userId: z.string().uuid() });

// R-7 (e): thin wrapper over the same DB effects as /api/recruiter/request-access (doc 06) —
// company resolved/created by GSTIN, member inserted `invited`, a verification request opened
// for a brand-new company. Cannot literally call that Next.js route (it is keyed to the caller's
// own session, not an admin acting on behalf of someone else) — same "reproduce the effect, not
// the literal call" tension R-6 documented for its member-intervention routes.
const createOnBehalfSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  gstin: z.string().regex(GSTIN_RE, 'Invalid GSTIN'),
  company_name: z.string().min(2).max(120).optional(), // required only when the GSTIN is new
  company_website: z.string().url().optional(),
  company_cin: z.string().regex(CIN_RE, 'Invalid CIN').optional(),
  industry: z.string().max(80).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  location: z.string().max(120).optional(),
  reason: z.string().min(10).max(500),
});

const bulkActiveSchema = z.object({ ids: z.array(z.string().uuid()).min(1), is_active: z.boolean() });
const bulkDeleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

function isLastAdminError(err: any): boolean {
  return typeof err?.message === 'string' && err.message.includes('last_admin');
}

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
      const denied = checkPermission(role, { resource: 'recruiters', action: 'view' }, cors);
      if (denied) return denied;

      const search = url.searchParams.get('search');
      const membershipStatus = url.searchParams.get('membership_status');
      const companyId = url.searchParams.get('company_id');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 25);
      const sort = url.searchParams.get('sort') || 'newest';

      // membership_status/company_id filter the JOINED company_members row, which requires an
      // inner join (PostgREST `!inner`) to exclude non-matching profiles — a plain embed only
      // filters which nested rows come back, not which parent rows do. Recruiters with no
      // membership row at all (e.g. mid self-serve signup) only appear when neither filter is set.
      const needsInnerJoin = Boolean(membershipStatus || companyId);
      const membersEmbed = `company_members${needsInnerJoin ? '!inner' : ''}(id, status, member_role, company_id, joined_at, companies(id, name, gstin, status))`;

      let query = db.database
        .from('profiles')
        .select(`id, email, name, phone, is_active, created_at, ${membersEmbed}, recruiter_profiles(job_title, about, is_approved, document_url, kyc_document_url, pan_number, aadhaar_number)`, {
          count: 'exact',
        })
        .eq('role', 'recruiter');

      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      }
      if (membershipStatus) query = query.eq('company_members.status', membershipStatus);
      if (companyId) query = query.eq('company_members.company_id', companyId);

      let orderField = 'created_at';
      let ascending = false;
      if (sort === 'oldest') ascending = true;
      else if (sort === 'name_asc') { orderField = 'name'; ascending = true; }
      else if (sort === 'name_desc') { orderField = 'name'; ascending = false; }

      const { data, count, error } = await query
        .order(orderField, { ascending })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      return json({ recruiters: data ?? [], total: count ?? 0, page, hasMore: (page + 1) * limit < (count ?? 0) }, 200, cors);
    }

    if (request.method === 'PATCH') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'edit' }, cors);
      if (denied) return denied;

      const id = url.searchParams.get('id');
      if (!id) return errorJson('invalid_request', 'ID is required', 400, cors);

      const rawBody = await request.json();
      const parsed = patchSchema.safeParse(rawBody);
      if (!parsed.success) {
        return errorJson('invalid_request', 'Invalid PATCH body', 400, cors, parsed.error.flatten().fieldErrors);
      }
      const { phone, ...recruiterProfileFields } = parsed.data;

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        if (phone !== undefined) {
          const { error: profileError } = await db.database.from('profiles').update({ phone }).eq('id', id);
          if (profileError) throw profileError;
        }
        let recruiterProfile = null;
        if (Object.keys(recruiterProfileFields).length > 0) {
          const { data, error: rpError } = await db.database
            .from('recruiter_profiles')
            .update(recruiterProfileFields)
            .eq('id', id)
            .select()
            .maybeSingle();
          if (rpError) throw rpError;
          recruiterProfile = data;
        }

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'recruiter_profile_updated',
            table_name: 'recruiter_profiles',
            record_id: id,
            metadata: { fields: Object.keys(parsed.data) },
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { recruiter_profile: recruiterProfile };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        throw workError;
      }
    }

    if (request.method === 'DELETE') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'delete' }, cors);
      if (denied) return denied;

      const id = url.searchParams.get('id');
      if (!id) return errorJson('invalid_request', 'ID is required', 400, cors);

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const resPayload = await deleteRecruiters(db, [id]);
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        if (isLastAdminError(workError)) {
          return errorJson('last_admin', 'This recruiter is the last active admin of their company.', 422, cors);
        }
        throw workError;
      }
    }

    if (request.method !== 'POST') {
      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'send-reset-link') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'approve' }, cors);
      if (denied) return denied;

      const parsed = resetLinkSchema.safeParse(body);
      if (!parsed.success) return errorJson('invalid_request', 'Invalid request', 400, cors, parsed.error.flatten().fieldErrors);

      const { data: target, error: targetError } = await db.database
        .from('profiles')
        .select('email, role')
        .eq('id', parsed.data.userId)
        .single();
      if (targetError || !target || target.role !== 'recruiter') {
        return errorJson('not_found', 'Recruiter not found', 404, cors);
      }

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const { error: sendError } = await db.auth.sendResetPasswordEmail({ email: target.email });
        if (sendError) throw sendError;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'recruiter_reset_link_sent',
            table_name: 'profiles',
            record_id: parsed.data.userId,
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { success: true };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        throw workError;
      }
    }

    if (action === 'create-on-behalf') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'approve' }, cors);
      if (denied) return denied;

      const parsed = createOnBehalfSchema.safeParse(body);
      if (!parsed.success) return errorJson('invalid_request', 'Invalid request', 400, cors, parsed.error.flatten().fieldErrors);
      const input = parsed.data;

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        // 1. Resolve or create the company by GSTIN (mirrors admin-companies POST).
        const { data: existingCompany } = await db.database
          .from('companies')
          .select('id, status')
          .eq('gstin', input.gstin)
          .maybeSingle();

        let companyId: string;
        let companyStatus: string;
        let isNewCompany = false;
        let memberRole: 'admin' | 'recruiter';

        if (existingCompany) {
          companyId = existingCompany.id;
          companyStatus = existingCompany.status;
          memberRole = 'recruiter';
        } else {
          if (!input.company_name) {
            return errorJson('invalid_request', 'company_name is required when the GSTIN does not match an existing company', 400, cors);
          }
          const { data: created, error: createError } = await db.database
            .from('companies')
            .insert([{
              name: input.company_name,
              gstin: input.gstin,
              cin: input.company_cin,
              website: input.company_website,
              industry: input.industry,
              size: input.size,
              location: input.location,
              created_by: userId,
            }])
            .select('id, status')
            .single();
          if (createError) {
            if (createError.code === '23505' || /gstin/i.test(createError.message ?? '')) {
              return errorJson('company_exists', 'A company with this GSTIN was just created by someone else — retry.', 409, cors);
            }
            throw createError;
          }
          companyId = created.id;
          companyStatus = created.status;
          isNewCompany = true;
          memberRole = 'admin';
        }

        // 2. Resolve or create the invitee's account. If new, invite via the same
        // signup-then-reset-email primitive as send-reset-link — no plaintext password.
        const { data: existingProfile } = await db.database
          .from('profiles')
          .select('id')
          .eq('email', input.email.toLowerCase())
          .maybeSingle();

        let memberUserId: string;
        if (existingProfile) {
          memberUserId = existingProfile.id;
        } else {
          const tempPassword = crypto.randomUUID() + crypto.randomUUID().toUpperCase() + 'aA1!';
          const { data: signupData, error: signupError } = await db.auth.signUp({
            email: input.email,
            password: tempPassword,
            name: input.full_name,
          });
          if (signupError) throw signupError;

          let newUserId = signupData?.user?.id;
          if (!newUserId) {
            const { data: newProfile } = await db.database
              .from('profiles')
              .select('id')
              .eq('email', input.email.toLowerCase())
              .maybeSingle();
            newUserId = newProfile?.id;
          }
          if (!newUserId) throw new Error('Failed to create account for invitee');
          memberUserId = newUserId;

          const { error: profileError } = await db.database
            .from('profiles')
            .update({ role: 'recruiter', name: input.full_name, phone: input.phone })
            .eq('id', memberUserId);
          if (profileError) throw profileError;

          await db.auth.sendResetPasswordEmail({ email: input.email });
        }

        // 3. Invite as a company member (same shape as R-6's staff member-invite branch).
        const { data: member, error: memberError } = await db.database
          .from('company_members')
          .insert({ company_id: companyId, user_id: memberUserId, member_role: memberRole, status: 'invited', invited_by: userId })
          .select('id, user_id, member_role, status')
          .single();
        if (memberError) {
          const message = memberError.message ?? '';
          if (message.includes('duplicate') || message.includes('unique')) {
            return errorJson('already_member', 'This person already belongs to a company.', 409, cors);
          }
          throw memberError;
        }

        // 4. New companies need a verification request queued — otherwise they never surface
        // in the normal verification queue for the admin's follow-up approval (doc 06 shape).
        if (isNewCompany) {
          const { data: request } = await db.database
            .from('company_verification_requests')
            .insert({ company_id: companyId, submitted_by: userId, channel: 'gmail_kyc', status: 'submitted' })
            .select('id')
            .single();

          await db.database.from('verification_audit_log').insert([
            { company_id: companyId, actor_id: userId, action: 'company_created', to_state: 'pending', metadata: { via: 'admin_create_on_behalf' } },
            { company_id: companyId, request_id: request?.id ?? null, actor_id: userId, action: 'verification_submitted', to_state: 'submitted', metadata: { via: 'admin_create_on_behalf' } },
          ]);
        }

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'recruiter_created_on_behalf',
            table_name: 'company_members',
            record_id: member.id,
            on_behalf_of: companyId,
            reason: input.reason,
            metadata: { email: input.email, company_id: companyId, new_company: isNewCompany },
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { member, company: { id: companyId, status: companyStatus }, newCompany: isNewCompany };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        throw workError;
      }
    }

    // ── Account-level bulk actions (orthogonal to company membership; is_active is the
    // platform-wide account kill switch, same flag/guard F-7 applies to every admin fn) ──
    if (action === 'bulk-active') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'edit' }, cors);
      if (denied) return denied;

      const parsed = bulkActiveSchema.safeParse(body);
      if (!parsed.success) return errorJson('invalid_request', 'Invalid request', 400, cors, parsed.error.flatten().fieldErrors);
      const { ids, is_active } = parsed.data;

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const { error } = await db.database.from('profiles').update({ is_active }).in('id', ids);
        if (error) throw error;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: is_active ? 'recruiters_unsuspended' : 'recruiters_suspended',
            table_name: 'profiles',
            record_id: ids[0],
            metadata: { target_ids: ids, count: ids.length, is_active },
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { success: true, count: ids.length };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        throw workError;
      }
    }

    if (action === 'bulk-delete') {
      const denied = checkPermission(role, { resource: 'recruiters', action: 'delete' }, cors);
      if (denied) return denied;

      const parsed = bulkDeleteSchema.safeParse(body);
      if (!parsed.success) return errorJson('invalid_request', 'Invalid request', 400, cors, parsed.error.flatten().fieldErrors);

      const idem = await beginIdempotency(db, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const resPayload = await deleteRecruiters(db, parsed.data.ids);

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'recruiters_bulk_deleted',
            table_name: 'profiles',
            record_id: parsed.data.ids[0],
            metadata: { deleted_ids: parsed.data.ids, count: parsed.data.ids.length },
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(db, idempotencyKey);
        if (isLastAdminError(workError)) {
          return errorJson('last_admin', 'One of these recruiters is the last active admin of their company.', 422, cors);
        }
        throw workError;
      }
    }

    return errorJson('invalid_request', 'Invalid action', 400, cors);
  } catch (error) {
    return internalError(cors, error);
  }
}

// Shared by DELETE and bulk-delete. recruiter_profiles has no FK to profiles, so it is deleted
// first explicitly; company_members rows cascade automatically (ON DELETE CASCADE) when the
// profiles row goes — which is exactly where trg_guard_last_company_admin can reject the delete
// with a `last_admin` error if the target is a company's sole active admin.
async function deleteRecruiters(db: any, ids: string[]): Promise<{ success: true; count: number }> {
  const { error: rpError } = await db.database.from('recruiter_profiles').delete().in('id', ids);
  if (rpError) throw rpError;

  const { error: pError } = await db.database.from('profiles').delete().in('id', ids);
  if (pError) throw pError;

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('API_KEY')!;
  const deleteResp = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ userIds: ids }),
  });
  if (!deleteResp.ok) {
    const errData = await deleteResp.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || 'Failed to delete recruiter auth accounts');
  }

  return { success: true, count: ids.length };
}
