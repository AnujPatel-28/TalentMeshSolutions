import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load local env files in precedence order
const envPaths = ['.env.local', '.env.development', '.env'];
let envLoaded = false;

envPaths.forEach((file) => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
    console.log(`[EnvCheck] Loaded configuration from: ${file}`);
    envLoaded = true;
  }
});

if (!envLoaded) {
  console.warn('[EnvCheck] WARNING: No local env files (.env.local, .env) were detected. Checking process.env directly.');
}

const REQUIRED_PUBLIC_VARS = [
  'NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY'
];

// Validator script for environment governance

let failed = false;
const missingRequired: string[] = [];

console.log('\n[EnvCheck] Validating environment variables...\n');

// 1. Verify Public variables
REQUIRED_PUBLIC_VARS.forEach((key) => {
  const val = process.env[key];
  if (!val) {
    missingRequired.push(key);
    failed = true;
  } else {
    console.log(`  ✓ ${key} is set`);
  }
});

// 2. Verify prefix safety
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    // It is public. Ensure it doesn't contain terms suggesting it holds secret keys
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('secret') || lowerKey.includes('pass') || lowerKey.includes('private') || lowerKey.includes('service_key')) {
      console.error(`  ✗ SECURITY WARNING: ${key} prefix is NEXT_PUBLIC_ but it seems to hold a private secret!`);
      failed = true;
    }
  }
});

console.log('\n------------------------------------------------');
if (failed) {
  console.error('[EnvCheck] FAILURE: Missing or invalid environment configurations.');
  if (missingRequired.length > 0) {
    console.error('Missing required variables:\n  ' + missingRequired.join('\n  '));
  }
  process.exit(1);
} else {
  console.log('[EnvCheck] SUCCESS: All required environment variables are set and validated.');
  process.exit(0);
}
