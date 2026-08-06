import { createClient } from '@insforge/sdk';

async function main() {
  const email = 'talentmeshdb@gmail.com';
  const password = 'Password@123';
  const name = 'Test Recruiter';
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!insforgeUrl || !insforgeAnonKey) {
    console.error('Error: InsForge URL or Anon Key is missing.');
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
        console.log('Account already exists. Use /auth/login to sign in.');
      } else {
        console.error('Signup failed:', error.message);
      }
      process.exit(1);
    }

    if (!data || !data.user) {
      console.error('Signup failed: No user data returned');
      process.exit(1);
    }

    // 2. Create the profile with recruiter role
    const { error: profileError } = await insforge.database
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        role: 'recruiter',
        name: name,
        is_onboarded: true
      }, { onConflict: 'email' });

    if (profileError) {
        console.error('Error creating recruiter profile:', profileError.message);
        process.exit(1);
    }
    
    console.log(`\n✓ Recruiter account created for ${email}`);
    console.log(`✓ Password: ${password}`);
    console.log('✓ Profile set with "recruiter" role.');

  } catch (err: any) {
    console.error('An unexpected error occurred:', err.message);
  }
}

main();
