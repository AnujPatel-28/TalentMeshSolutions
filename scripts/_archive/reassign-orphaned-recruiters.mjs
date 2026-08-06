import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

const insforge = createClient({
  baseUrl,
  anonKey: serviceKey,
  isServerMode: true
});

async function run() {
  // 1. Get all recruiter/admin profiles
  const { data: profiles, error: pError } = await insforge.database
    .from('profiles')
    .select('id, role, name')
    .in('role', ['recruiter', 'admin', 'super_admin']);

  if (pError || !profiles || profiles.length === 0) {
    console.error('Failed to fetch valid admin/recruiter profiles:', pError);
    return;
  }

  const fallbackProfile = profiles.find(p => p.role === 'recruiter') || profiles[0];
  console.log(`Using fallback profile: ${fallbackProfile.name} (${fallbackProfile.id}, role: ${fallbackProfile.role})`);

  // 2. Fetch all jobs to inspect recruiter_ids
  const { data: jobs, error: jError } = await insforge.database
    .from('jobs')
    .select('id, title, recruiter_id');

  if (jError || !jobs) {
    console.error('Failed to fetch jobs:', jError);
    return;
  }

  const validProfileIds = new Set(profiles.map(p => p.id));
  const orphanedJobs = jobs.filter(j => !j.recruiter_id || !validProfileIds.has(j.recruiter_id));

  console.log(`Found ${orphanedJobs.length} jobs with orphaned or invalid recruiter_id values.`);

  if (orphanedJobs.length > 0) {
    for (const job of orphanedJobs) {
      console.log(`Reassigning job "${job.title}" (ID: ${job.id}) from recruiter "${job.recruiter_id}" to fallback "${fallbackProfile.id}"`);
      const { error: updateErr } = await insforge.database
        .from('jobs')
        .update({ recruiter_id: fallbackProfile.id })
        .eq('id', job.id);
      
      if (updateErr) {
        console.error(`Failed to reassign job ${job.id}:`, updateErr);
      } else {
        console.log(`Successfully reassigned job ${job.id}`);
      }
    }
  } else {
    console.log('No orphaned jobs found. Data integrity is intact!');
  }
}

run();
