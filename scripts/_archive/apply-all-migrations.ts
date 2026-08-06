import { createClient } from '@insforge/sdk';
import * as fs from 'fs';
import * as path from 'path';
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

async function main() {
  console.log('--- Applying Database Migrations Sequentially ---');
  
  const migrationsDir = path.resolve(__dirname, '../insforge/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Alphabetic sort: 001, 002, ..., 012

  console.log(`Found ${files.length} migration files to apply:`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    try {
      const { data, error } = await insforge.database.rpc('exec_sql', { query: sqlContent });
      if (error) {
        console.error(`❌ Error executing migration ${file}:`, error.message);
        process.exit(1);
      }
      
      const res = data as any;
      if (res && res.success === false) {
        console.error(`❌ Migration ${file} failed logic:`, res.error);
        process.exit(1);
      }
      console.log(`✅ Success: ${file} applied.`);
    } catch (err: any) {
      console.error(`❌ Unexpected error executing migration ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations applied successfully!');
}

main();
