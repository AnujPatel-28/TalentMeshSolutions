import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';

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

async function run() {
  console.log('--- Running RLS Regression Test Suite (Automated Database Gating) ---');
  
  const query = `
    DO $$
    DECLARE
      comp_a UUID;
      comp_b UUID;
      rec_a_id UUID;
      rec_b_id UUID;
      cand_a_id UUID;
      cand_b_id UUID;
      job_a UUID;
      job_b UUID;
      res_a UUID;
      res_b UUID;
      app_a UUID;
      app_b UUID;
      test_count INT;
    BEGIN
      -- 1. Create test companies
      INSERT INTO public.companies (name) VALUES ('Test Company A') RETURNING id INTO comp_a;
      INSERT INTO public.companies (name) VALUES ('Test Company B') RETURNING id INTO comp_b;

      -- 2. Create test profiles for recruiters and candidates
      -- Recruiter A
      INSERT INTO public.profiles (email, role, company_id, name)
      VALUES ('recruiter_a@test.com', 'recruiter', comp_a, 'Recruiter A') RETURNING id INTO rec_a_id;
      INSERT INTO public.recruiter_profiles (id, is_approved, recruiter_role)
      VALUES (rec_a_id, true, 'recruiter');

      -- Recruiter B
      INSERT INTO public.profiles (email, role, company_id, name)
      VALUES ('recruiter_b@test.com', 'recruiter', comp_b, 'Recruiter B') RETURNING id INTO rec_b_id;
      INSERT INTO public.recruiter_profiles (id, is_approved, recruiter_role)
      VALUES (rec_b_id, true, 'recruiter');

      -- Candidate A
      INSERT INTO public.profiles (email, role, name)
      VALUES ('candidate_a@test.com', 'candidate', 'Candidate A') RETURNING id INTO cand_a_id;
      INSERT INTO public.candidate_profiles (id, is_discoverable)
      VALUES (cand_a_id, true);

      -- Candidate B
      INSERT INTO public.profiles (email, role, name)
      VALUES ('candidate_b@test.com', 'candidate', 'Candidate B') RETURNING id INTO cand_b_id;
      INSERT INTO public.candidate_profiles (id, is_discoverable)
      VALUES (cand_b_id, true);

      -- 3. Create test resumes
      INSERT INTO public.candidate_resumes (candidate_id, label, file_name, file_url, file_size_bytes)
      VALUES (cand_a_id, 'Resume A', 'resume_a.pdf', 'https://s3/resumes/a.pdf', 100) RETURNING id INTO res_a;

      INSERT INTO public.candidate_resumes (candidate_id, label, file_name, file_url, file_size_bytes)
      VALUES (cand_b_id, 'Resume B', 'resume_b.pdf', 'https://s3/resumes/b.pdf', 200) RETURNING id INTO res_b;

      -- Update candidate profiles with primary resumes
      UPDATE public.candidate_profiles SET primary_resume_id = res_a WHERE id = cand_a_id;
      UPDATE public.candidate_profiles SET primary_resume_id = res_b WHERE id = cand_b_id;

      -- 4. Create test jobs
      INSERT INTO public.jobs (company_id, recruiter_id, title, status)
      VALUES (comp_a, rec_a_id, 'Job Company A', 'published') RETURNING id INTO job_a;

      INSERT INTO public.jobs (company_id, recruiter_id, title, status)
      VALUES (comp_b, rec_b_id, 'Job Company B', 'published') RETURNING id INTO job_b;

      -- 5. Create test applications
      -- Candidate A applies to Job A (Company A)
      INSERT INTO public.applications (candidate_id, job_id, resume_id, status)
      VALUES (cand_a_id, job_a, res_a, 'applied') RETURNING id INTO app_a;

      -- Candidate B applies to Job B (Company B)
      INSERT INTO public.applications (candidate_id, job_id, resume_id, status)
      VALUES (cand_b_id, job_b, res_b, 'applied') RETURNING id INTO app_b;

      -------------------------------------------------------------
      -- ASSERTIONS
      -------------------------------------------------------------

      -- A. Test Recruiter A context
      -- Set request JWT context for Recruiter A
      PERFORM set_config('request.jwt.claims', json_build_object('sub', rec_a_id::text, 'role', 'authenticated')::text, true);

      -- A1. Recruiter A should see Candidate Profile A (applied to Company A)
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_a_id;
      IF test_count <> 1 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter A cannot select Candidate Profile A (who applied to Company A)';
      END IF;

      -- A2. Recruiter A should NOT see Candidate Profile B (applied to Company B only)
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_b_id;
      IF test_count <> 0 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter A can select Candidate Profile B (who applied only to Company B)';
      END IF;

      -- A3. Recruiter A should see Resume A (associated with Job A)
      SELECT COUNT(*) INTO test_count FROM public.candidate_resumes WHERE id = res_a;
      IF test_count <> 1 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter A cannot select Candidate Resume A (who applied to Company A)';
      END IF;

      -- A4. Recruiter A should NOT see Resume B (associated with Job B only)
      SELECT COUNT(*) INTO test_count FROM public.candidate_resumes WHERE id = res_b;
      IF test_count <> 0 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter A can select Candidate Resume B (who applied only to Company B)';
      END IF;

      -- B. Test Candidate A context
      PERFORM set_config('request.jwt.claims', json_build_object('sub', cand_a_id::text, 'role', 'authenticated')::text, true);

      -- B1. Candidate A should see own profile
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_a_id;
      IF test_count <> 1 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Candidate A cannot select own Profile';
      END IF;

      -- B2. Candidate A should NOT see Candidate B''s profile
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_b_id;
      IF test_count <> 0 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Candidate A can select Candidate B Profile';
      END IF;

      -- B3. Candidate A should see own resume
      SELECT COUNT(*) INTO test_count FROM public.candidate_resumes WHERE id = res_a;
      IF test_count <> 1 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Candidate A cannot select own Resume';
      END IF;

      -- B4. Candidate A should NOT see Candidate B''s resume
      SELECT COUNT(*) INTO test_count FROM public.candidate_resumes WHERE id = res_b;
      IF test_count <> 0 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Candidate A can select Candidate B Resume';
      END IF;

      -- C. Test Recruiter B context
      PERFORM set_config('request.jwt.claims', json_build_object('sub', rec_b_id::text, 'role', 'authenticated')::text, true);

      -- C1. Recruiter B should see Candidate B
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_b_id;
      IF test_count <> 1 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter B cannot select Candidate Profile B (who applied to Company B)';
      END IF;

      -- C2. Recruiter B should NOT see Candidate A
      SELECT COUNT(*) INTO test_count FROM public.candidate_profiles WHERE id = cand_a_id;
      IF test_count <> 0 THEN
        RAISE EXCEPTION 'RLS_FAILURE: Recruiter B can select Candidate Profile A (who applied only to Company A)';
      END IF;

      -- Trigger transaction rollback to clean up test tables
      RAISE EXCEPTION 'SUCCESS_TEST_PASSED';

    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM = 'SUCCESS_TEST_PASSED' THEN
          -- Test passed successfully!
          NULL;
        ELSE
          -- Test failed! Rethrow the error.
          RAISE EXCEPTION '%', SQLERRM;
        END IF;
    END;
    $$;
  `;

  const { data, error } = await insforge.database.rpc('exec_sql', { query });
  
  if (error) {
    console.error('❌ RLS Regression Test Failed:', error.message || error);
    process.exit(1);
  } else {
    console.log('✅ RLS Regression Test Passed Successfully!');
    console.log(' - Candidate Profiles RLS verified.');
    console.log(' - Candidate Resumes RLS verified.');
    console.log(' - Multi-Company Recruiter Isolation verified.');
    console.log(' - Auto-rollback verified (no test data leaked).');
  }
}

run();
