import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

const insforge = createClient({
  baseUrl: supabaseUrl,
  anonKey: serviceKey,
  isServerMode: true
});

async function run() {
  const query = `
    DO $$
    DECLARE
      r RECORD;
      msg TEXT := 'COLUMNS_LIST:';
    BEGIN
      FOR r IN 
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'candidate_resumes' AND table_schema = 'public'
      LOOP
        msg := msg || E'\\n' || r.column_name || ' | ' || r.data_type || ' | ' || COALESCE(r.character_maximum_length::text, 'null') || ' | ' || r.is_nullable;
      END LOOP;
      RAISE EXCEPTION '%', msg;
    END;
    $$;
  `;
  const { data, error } = await insforge.database.rpc('exec_sql', { query });
  console.log('Result:', data, error);
}

run();
