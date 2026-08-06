import fs from 'fs';

const API_BASE_URL = 'https://sytk3jgv.ap-southeast.insforge.app';
const API_KEY = 'ik_1a616463854d5d7b3fef4c4bf7516aee';

async function updateFunction(slug, filePath) {
  console.log(`Deploying function "${slug}" from ${filePath}...`);
  const code = fs.readFileSync(filePath, 'utf8');
  
  const response = await fetch(`${API_BASE_URL}/api/functions/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ code })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update ${slug}: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`Successfully updated ${slug}:`, JSON.stringify(result, null, 2));
}

async function main() {
  await updateFunction('auth-session', 'insforge/functions/auth-session/index.ts');
  await updateFunction('candidate-applications-id', 'insforge/functions/candidate-applications-id/index.ts');
  console.log('\n=== Target Edge Functions Deployed Successfully ===\n');
}

main().catch(console.error);
