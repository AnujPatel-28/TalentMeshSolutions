import { createClient } from '@insforge/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_INSFORGE_URL or INSFORGE_SERVICE_KEY is missing from environment.');
  process.exit(1);
}

const insforge = createClient({
  baseUrl: supabaseUrl,
  anonKey: serviceKey,
  isServerMode: true
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define object-existence checks for each migration to prevent execution conflicts
const checks = {
  '001_schema_and_rls.sql': { type: 'table', name: 'profiles' },
  '002_recruiter_documents.sql': { type: 'bucket', name: 'recruiter_documents' },
  '003_fix_profiles_rls.sql': { type: 'table', name: 'profiles' },
  '004_candidate_resumes.sql': { type: 'table', name: 'candidate_resumes' },
  '005_fix_job_approval_rls.sql': { type: 'table', name: 'jobs' },
  '006_platform_settings.sql': { type: 'table', name: 'platform_settings' },
  '007_add_admin_role_constraint.sql': { type: 'table', name: 'platform_settings' },
  '008_status_history.sql': { type: 'table', name: 'application_status_history' },
  '009_announcement_image.sql': { type: 'table', name: 'announcements' },
  '010_schema_repair_drift_fix.sql': { type: 'table', name: 'profiles' },
  '010_user_preferences.sql': { type: 'table', name: 'user_preferences' },
  '011_export_jobs.sql': { type: 'table', name: 'export_jobs' },
  '011_resume_architecture.sql': { type: 'table', name: 'resume_access_log' },
  '012_cleanup_idempotency_keys.sql': { type: 'table', name: 'idempotency_keys' },
  '012_data_backfill_primary_resumes.sql': { type: 'table', name: 'resume_access_log' },
  '013_claim_export_job.sql': { type: 'function', name: 'claim_export_job' },
  '013_resume_access_log_previewed.sql': { type: 'table', name: 'resume_access_log' },
  // 013_security_and_architectural_fixes.sql, 014_fix_applications_count_withdrawn.sql are idempotent (DROP + CREATE)
  '014_notification_queue.sql': { type: 'table', name: 'notification_templates' },
  '015_session_governance_cleanup.sql': { type: 'table', name: 'user_sessions' },
  '016_resumes_storage_rls.sql': { type: 'policy', schema: 'storage', table: 'objects', name: 'resumes_select' },
  '026_profile_strength_calculation.sql': { type: 'function', name: 'calculate_profile_strength_score' },
  '027_create_interviews_table.sql': { type: 'table', name: 'interviews' },
  '028_recruiter_team_rbac.sql': { type: 'table', name: 'authorization_events' },
  '029_user_rate_limits.sql': { type: 'table', name: 'user_rate_limits' },
  // 046_company_first_companies.sql has no clean single-object sentinel (in-place alter + drop);
  // it is applied individually at T10, not via this script's automated loop — no entry here.
  '047_company_members_and_authz.sql': { type: 'table', name: 'company_members' },
  '048_verification_workflow.sql': { type: 'table', name: 'company_verification_requests' },
  '049_repoint_ownership_and_rpcs.sql': { type: 'function', name: 'create_job' },
  '050_company_scoped_rls_and_plans.sql': { type: 'table', name: 'plan_limits' },
  '051_verification_and_member_rpcs.sql': { type: 'function', name: 'accept_company_invite' }
};

async function checkExists(check) {
  if (!check) return false;

  try {
    let query = '';
    if (check.type === 'table') {
      query = `DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${check.name}') THEN RAISE EXCEPTION 'EXISTS'; END IF; END; $$;`;
    } else if (check.type === 'function') {
      query = `DO $$ BEGIN IF EXISTS (SELECT FROM pg_proc WHERE proname = '${check.name}') THEN RAISE EXCEPTION 'EXISTS'; END IF; END; $$;`;
    } else if (check.type === 'bucket') {
      query = `DO $$ BEGIN IF EXISTS (SELECT FROM storage.buckets WHERE name = '${check.name}') THEN RAISE EXCEPTION 'EXISTS'; END IF; END; $$;`;
    } else if (check.type === 'policy') {
      query = `DO $$ BEGIN IF EXISTS (SELECT FROM pg_policies WHERE schemaname = '${check.schema}' AND tablename = '${check.table}' AND policyname = '${check.name}') THEN RAISE EXCEPTION 'EXISTS'; END IF; END; $$;`;
    }

    const { data, error } = await insforge.database.rpc('exec_sql', { query });
    if (error) {
      console.warn(`[Check] RPC Error for ${check.name}:`, error.message || error);
      return false;
    }
    
    // exec_sql returns { success: false, error: 'EXISTS' } when table/policy exists
    return data && data.success === false && data.error === 'EXISTS';
  } catch (err) {
    console.warn(`[Check] Failed to run existence check for ${check.name}:`, err.message || err);
  }
  return false;
}

async function main() {
  console.log('--- Applying Database Migrations Safely (Conflict Prevention Mode) ---');
  
  const migrationsDir = path.resolve(__dirname, '../insforge/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // sorted alphabetically

  for (const file of files) {
    const check = checks[file];
    if (check) {
      const exists = await checkExists(check);
      if (exists) {
        console.log(`[Skip] Migration ${file} is already applied (detected existing ${check.type}: ${check.name}).`);
        continue;
      }
    }

    const filePath = path.join(migrationsDir, file);
    console.log(`[Apply] Running migration: ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    try {
      const { data, error } = await insforge.database.rpc('exec_sql', { query: sqlContent });
      if (error) {
        console.error(`❌ Error executing migration ${file}:`, error.message);
        process.exit(1);
      }
      if (data && data.success === false) {
        console.error(`❌ Migration ${file} failed logic:`, data.error);
        process.exit(1);
      }
      // Success message for applied migration
      console.log(`✅ Success: ${file} applied.`);

    } catch (err) {
      console.error(`❌ Unexpected error executing migration ${file}:`, err.message || err);
      process.exit(1);
    }
  }

  console.log('🎉 All applicable migrations applied successfully!');

  // Run verification for resumes storage RLS
  console.log('\n--- Running Verification for resumes storage RLS ---');
  const policies = ['resumes_select', 'resumes_insert', 'resumes_update', 'resumes_delete'];
  const activePolicies = [];
  for (const policyName of policies) {
    const exists = await checkExists({ type: 'policy', schema: 'storage', table: 'objects', name: policyName });
    if (exists) {
      activePolicies.push(policyName);
    }
  }
  console.log('Active resumes policies in database:');
  console.log(JSON.stringify(activePolicies, null, 2));
  console.log('---------------------------------------------------\n');
}

main();
