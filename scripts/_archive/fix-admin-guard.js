const fs = require('fs');
const path = require('path');

const functionsDir = 'insforge/functions';
const files = [
  'profile-complete-onboarding/index.ts',
  'mfa-status/index.ts',
  'mfa-backup-codes/index.ts',
  'candidate-profile/index.ts',
  'candidate-applications-id/index.ts',
  'candidate-applications/index.ts',
  'auth-session/index.ts'
];

files.forEach(file => {
  const filePath = path.join(functionsDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the guard
  content = content.replace(
    /if\s*\((authError\s*\|\|\s*!authData\?\.user)\)\s*\{/,
    "if ($1 || authData.user.id === 'project-admin-with-api-key') {"
  );

  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});
