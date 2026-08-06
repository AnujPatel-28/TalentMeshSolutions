import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

const insforge = createClient({
  baseUrl,
  anonKey: serviceKey,
  isServerMode: true
});

async function run() {
  const sqlPath = path.resolve('insforge/migrations/034_fix_withdrawal_actor_id.sql');
  const query = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration 034...');
  const { data, error } = await insforge.database.rpc('exec_sql', { query });
  console.log('Result:', data, error);
}

run();
