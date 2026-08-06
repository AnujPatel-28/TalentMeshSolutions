import { createClient } from '@insforge/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load local environment variables
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

async function main() {
  console.log('--- Applying Database Migration: Export Jobs ---');
  
  const sqlPath = path.resolve(__dirname, '../insforge/migrations/011_export_jobs.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`Error: SQL script not found at ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Successfully read SQL script. Length: ${sqlContent.length} chars.`);

  console.log('Executing SQL query via exec_sql RPC...');
  try {
    const { data, error } = await insforge.database.rpc('exec_sql', { query: sqlContent });
    if (error) {
      console.error('Execution failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Success: export_jobs and export_candidates tables updated successfully.');
  } catch (err: any) {
    console.error('Unexpected error during RPC execution:', err.message);
    process.exit(1);
  }
}

main();
