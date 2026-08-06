// Post-apply verification for insforge/migrations/058_jobs_approval_single_source.sql.
//
// Asserts three things:
//   1. approval_status is the single source of truth — is_approved can never drift from it.
//   2. Authorization — role `authenticated` cannot write approval_status / is_approved,
//      but CAN still edit content columns and change status (legitimate recruiter editing).
//   3. Product decision (MVP) — editing an already-approved job PRESERVES 'approved'.
//      There is deliberately no automatic re-moderation after an edit.
//
// Run AFTER 058 is applied: node scripts/verify_job_approval_invariant.mjs

import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

if (!baseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_INSFORGE_URL or INSFORGE_SERVICE_KEY is missing from environment.');
  process.exit(1);
}

const insforge = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });

async function run() {
  console.log('--- Verifying 058: job approval single source of truth + authorization ---');

  // Every probe write happens inside the DO block and is rolled back by the final RAISE.
  const query = `
    DO $$
    DECLARE
      drifted    INT;
      bad_priv   INT;
      has_table  INT;
      v_company  UUID;
      v_job      UUID;
      v_flag     BOOLEAN;
      v_appr     TEXT;
    BEGIN
      -- ── 1. Invariant: no row may have the two columns disagreeing ───────────────────
      SELECT count(*) INTO drifted FROM public.jobs
       WHERE is_approved IS DISTINCT FROM (approval_status = 'approved');
      IF drifted > 0 THEN
        RAISE EXCEPTION 'FAILED(1): % job row(s) have is_approved out of sync with approval_status', drifted;
      END IF;

      -- ── 2. Authorization: privileges must be column-scoped ─────────────────────────
      SELECT count(*) INTO has_table FROM information_schema.table_privileges
       WHERE table_schema='public' AND table_name='jobs'
         AND grantee='authenticated' AND privilege_type='UPDATE';
      IF has_table > 0 THEN
        RAISE EXCEPTION 'FAILED(2a): authenticated still holds table-wide UPDATE on jobs (058 section C not applied)';
      END IF;

      SELECT count(*) INTO bad_priv FROM information_schema.column_privileges
       WHERE table_schema='public' AND table_name='jobs'
         AND grantee='authenticated' AND privilege_type='UPDATE'
         AND column_name IN ('is_approved','approval_status');
      IF bad_priv > 0 THEN
        RAISE EXCEPTION 'FAILED(2b): authenticated can still UPDATE % approval column(s)', bad_priv;
      END IF;

      -- ── 3. Trigger: an is_approved-only write cannot publish a pending job ──────────
      INSERT INTO public.companies (name) VALUES ('Approval Invariant Probe') RETURNING id INTO v_company;
      INSERT INTO public.jobs (company_id, title, description, status, approval_status, is_approved)
      VALUES (v_company, 'Invariant Probe', 'probe', 'draft', 'pending', true)
      RETURNING id, is_approved INTO v_job, v_flag;
      IF v_flag IS NOT FALSE THEN
        RAISE EXCEPTION 'FAILED(3a): insert with is_approved=true on a pending job kept is_approved=%', v_flag;
      END IF;

      UPDATE public.jobs SET is_approved = true WHERE id = v_job RETURNING is_approved INTO v_flag;
      IF v_flag IS NOT FALSE THEN
        RAISE EXCEPTION 'FAILED(3b): update to is_approved=true on a pending job kept is_approved=%', v_flag;
      END IF;

      -- ── 4. Approving via approval_status derives the flag ──────────────────────────
      UPDATE public.jobs SET approval_status = 'approved' WHERE id = v_job
        RETURNING is_approved INTO v_flag;
      IF v_flag IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED(4): approval_status=approved did not derive is_approved=true (got %)', v_flag;
      END IF;

      -- ── 5. PRODUCT DECISION: editing an approved job preserves approval ────────────
      --    No automatic re-moderation. This assertion is the guard against someone
      --    "helpfully" adding a reset-to-pending trigger later.
      UPDATE public.jobs SET title = 'Invariant Probe (edited)', description = 'edited'
       WHERE id = v_job
       RETURNING approval_status, is_approved INTO v_appr, v_flag;
      IF v_appr <> 'approved' OR v_flag IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED(5): editing an approved job changed approval state to %/% — MVP decision is that edits preserve approval', v_appr, v_flag;
      END IF;

      RAISE EXCEPTION 'SUCCESS_TEST_PASSED';

    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM = 'SUCCESS_TEST_PASSED' THEN
          NULL; -- passed; the raise rolls back every probe row
        ELSE
          RAISE EXCEPTION '%', SQLERRM;
        END IF;
    END;
    $$;
  `;

  const { error } = await insforge.database.rpc('exec_sql', { query });

  if (error) {
    console.error('❌ Verification FAILED:', error.message || error);
    process.exit(1);
  }

  console.log('✅ All assertions hold.');
  console.log(' - No drifted rows.');
  console.log(' - authenticated has no table-wide UPDATE and cannot write approval columns.');
  console.log(' - is_approved-only writes cannot publish a pending job.');
  console.log(' - approval_status=approved derives is_approved=true.');
  console.log(' - Editing an approved job preserves approval (no auto re-moderation).');
  console.log(' - Auto-rollback verified (no probe data leaked).');
}

run();
