import { createClient } from '@insforge/sdk';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- TalentMesh Admin Creation ---');

  const email = process.env.ADMIN_EMAIL || await question('Enter Admin Email: ');
  const password = process.env.ADMIN_PASSWORD || await question('Enter Admin Password (min 8 chars, uppercase + number): ');
  const name = process.env.ADMIN_NAME || await question('Enter Admin Display Name: ');
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || await question('Enter InsForge URL: ');
  const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || await question('Enter InsForge Anon Key: ');

  if (!email || !password || !name || !insforgeUrl || !insforgeAnonKey) {
    console.error('Error: All fields are required.');
    process.exit(1);
  }

  // Basic password validation — mirrors lib/validation/auth.ts and the InsForge auth
  // config. Inlined rather than imported: this script runs outside the Next.js path aliases.
  if (
    password.length < 12 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    console.error('Error: Password must be at least 12 chars and contain an uppercase letter, a lowercase letter, a number and a special character.');
    process.exit(1);
  }

  const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
  });

  try {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
    });

    if (error) {
      if (error.message.includes('User already exists')) {
        console.log('Account already exists. Use /admin/login to sign in.');
      } else {
        console.error('Signup failed:', error.message);
      }
      process.exit(1);
    }

    if (!data || !data.user) {
      console.error('Signup failed: No user data returned');
      process.exit(1);
    }

    // 2. Create the profile with admin role
    const { error: profileError } = await insforge.database
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        role: 'admin',
        name: name,
        is_onboarded: true
      }, { onConflict: 'email' });

    if (profileError) {
        console.error('Error creating admin profile:', profileError.message);
        process.exit(1);
    }
    
    console.log(`\n✓ Admin account created for ${email}`);
    console.log('✓ Profile set with "admin" role.');
    console.log('✓ You can now log in at /login');

  } catch (err: any) {
    console.error('An unexpected error occurred:', err.message);
  } finally {
    rl.close();
  }
}

main();
