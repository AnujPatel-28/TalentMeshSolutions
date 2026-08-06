import fs from 'fs';

const API_BASE_URL = 'https://sytk3jgv.ap-southeast.insforge.app';
const API_KEY = 'ik_1a616463854d5d7b3fef4c4bf7516aee';

async function updateFunction(slug, filePath) {
  console.log(`Deploying function "${slug}" from ${filePath}...`);
  const code = fs.readFileSync(filePath, 'utf8');
  
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/functions/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({ code })
      });
      
      if (response.status === 504 || response.status === 502) {
        console.warn(`Attempt ${attempt} for "${slug}" returned ${response.status}. Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update ${slug}: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Successfully updated ${slug}:`, JSON.stringify(result, null, 2));
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`Attempt ${attempt} for "${slug}" failed with error: ${err.message}. Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function main() {
  await updateFunction('recruiter-dashboard', 'insforge/functions/recruiter-dashboard/index.ts');
  await updateFunction('update-application', 'insforge/functions/update-application/index.ts');
  await updateFunction('candidate-applications', 'insforge/functions/candidate-applications/index.ts');
  await updateFunction('candidate-applications-id', 'insforge/functions/candidate-applications-id/index.ts');
  await updateFunction('admin-applications', 'insforge/functions/admin-applications/index.ts');
  await updateFunction('admin-reports', 'insforge/functions/admin-reports/index.ts');
  await updateFunction('dashboard', 'insforge/functions/dashboard/index.ts');
  await updateFunction('admin-settings', 'insforge/functions/admin-settings/index.ts');
  await updateFunction('admin-jobs', 'insforge/functions/admin-jobs/index.ts');
  await updateFunction('admin-plans', 'insforge/functions/admin-plans/index.ts');
  await updateFunction('admin-billing', 'insforge/functions/admin-billing/index.ts');
  console.log('\n=== Edge Functions Deployed Successfully ===\n');
}

main().catch(console.error);
