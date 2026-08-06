import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

const insforge = createClient({
  baseUrl,
  anonKey: serviceKey,
  isServerMode: true
});

async function main() {
  const { data, error } = await insforge.auth.admin.updateUserById(
    '0141ed42-1a69-40a4-9125-4c6b8a0d5c22',
    { password: 'Password@123', email_confirm: true }
  );
  if (error) {
    console.error('Failed to update password:', error);
  } else {
    console.log('Password updated successfully for talentmeshdb@gmail.com');
  }
}
main();
