import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { requestAccessSchema } from '@/lib/validation/company';

const VERIFICATION_EMAIL = process.env.RECRUITER_VERIFICATION_EMAIL;

// Service key is required here: `companies` has no INSERT policy (046) and
// `company_members_admin_write` (047) needs an existing admin membership — the requester has
// neither. Every ownership column below (created_by / user_id / submitted_by) comes from the
// session user, never from the body.
export const POST = withApi(
  { schema: { body: requestAccessSchema }, allowedRoles: ['candidate', 'recruiter'], auditLog: true },
  async (_req, { user, body }) => {
    if (!insforgeAdmin) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }
    if (!VERIFICATION_EMAIL) {
      return NextResponse.json({ error: 'Internal Server Error: RECRUITER_VERIFICATION_EMAIL not configured' }, { status: 500 });
    }
    const db = insforgeAdmin.database;

    // Phase 1: one membership per user (company_members_one_active_per_user, 047).
    const { data: existingMember } = await db
      .from('company_members')
      .select('company_id, status')
      .eq('user_id', user.id)
      .neq('status', 'removed')
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'already_member', message: 'You already belong to a company.', company_id: existingMember.company_id },
        { status: 403 }
      );
    }

    // ── Attach to an existing company (the 409 → attach path) ──
    if (body.attach_company_id) {
      const { data: target } = await db
        .from('companies')
        .select('id, name, status')
        .eq('id', body.attach_company_id)
        .maybeSingle();

      if (!target) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // 'recruiter', not 'admin': the existing company already has an admin, and an attach is a
      // self-service join request — it must not mint a second admin. Stays 'invited'.
      const { error: memberError } = await db.from('company_members').insert({
        company_id: target.id,
        user_id: user.id,
        member_role: 'recruiter',
        status: 'invited',
      });
      if (memberError) {
        return NextResponse.json({ error: 'Failed to request access' }, { status: 500 });
      }

      await db.from('verification_audit_log').insert({
        company_id: target.id,
        actor_id: user.id,
        action: 'member_invited',
        to_state: 'invited',
        metadata: { via: 'attach' },
      });
      await bumpToRecruiter(user);
      await db.from('profiles').update({ phone: body.phone }).eq('id', user.id);

      return NextResponse.json({ status: 'pending', company_id: target.id, company_status: target.status });
    }

    // ── Create a new company ── dedupe on GSTIN (companies_gstin_key, 046)
    if (body.gstin) {
      const { data: dupe } = await db.from('companies').select('id, name').eq('gstin', body.gstin).maybeSingle();
      if (dupe) {
        return NextResponse.json(
          {
            error: 'company_exists',
            message: `${dupe.name} is already registered with this GSTIN. Request to join it instead.`,
            company_id: dupe.id,
          },
          { status: 409 }
        );
      }
    }

    const { data: company, error: companyError } = await db
      .from('companies')
      .insert({
        name: body.name,
        industry: body.industry,
        website: body.website || null,
        gstin: body.gstin || null,
        cin: body.cin || null,
        country_code: body.country_code,
        description: body.description || null,
        status: 'pending',
        created_by: user.id,
      })
      .select('id, status')
      .single();

    if (companyError || !company) {
      // Lost the race on companies_gstin_key between the check above and this insert.
      if (companyError?.message?.includes('gstin')) {
        return NextResponse.json({ error: 'company_exists', message: 'This GSTIN is already registered.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }

    // Creator is the company admin, inactive until approve_company_verification flips it (049).
    await db.from('company_members').insert({
      company_id: company.id,
      user_id: user.id,
      member_role: 'admin',
      status: 'invited',
    });

    const { data: request } = await db
      .from('company_verification_requests')
      .insert({
        company_id: company.id,
        submitted_by: user.id,
        channel: 'gmail_kyc',
        status: 'submitted',
      })
      .select('id')
      .single();

    await db.from('verification_audit_log').insert([
      { company_id: company.id, actor_id: user.id, action: 'company_created', to_state: 'pending' },
      {
        company_id: company.id,
        request_id: request?.id ?? null,
        actor_id: user.id,
        action: 'verification_submitted',
        to_state: 'submitted',
      },
    ]);

    await bumpToRecruiter(user);
    await db.from('profiles').update({ phone: body.phone }).eq('id', user.id);

    return NextResponse.json({
      status: 'pending',
      company_id: company.id,
      request_id: request?.id ?? null,
      verificationEmail: VERIFICATION_EMAIL,
      message: `Email your GSTIN/CIN and business documents to ${VERIFICATION_EMAIL} to complete verification.`,
    });
  }
);

// Role bump is server-side from the session (doc 03 step 5) — the body never carries a role.
// guard_profile_privileged_cols (047) only lets postgres/project_admin/admins change `role`.
// completed_onboarding is set here too: "form submitted" is a separate concept from "approved" —
// the recruiter/company approval gate (app/dashboard/recruiter/layout.tsx) is what still blocks
// the dashboard until an admin approves.
async function bumpToRecruiter(user: { id: string; role?: string }) {
  const updates: { role?: string; completed_onboarding: boolean } = { completed_onboarding: true };
  if (user.role === 'candidate') {
    updates.role = 'recruiter';
  }
  await insforgeAdmin!.database.from('profiles').update(updates).eq('id', user.id);
}
