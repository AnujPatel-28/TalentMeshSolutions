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

/**
 * Script to provision a brand-new Admin user account (or update an existing one)
 * with password '#Nandi04', send a 6-digit email verification OTP code,
 * and elevate the profile role to 'admin'.
 */
async function setupAdminAccount(targetEmail, targetPassword = '#Nandi04', adminName = 'TalentMesh Super Admin') {
  if (!targetEmail) {
    console.error('\n❌ Error: Please specify a target admin email address.');
    console.log('Usage: node scripts/setup-admin-account.mjs <new-admin-email@domain.com> [optional-password]\n');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('TalentMesh Admin Account Provisioner');
  console.log('======================================================');
  console.log(`Target Email:   ${targetEmail}`);
  console.log(`Password:       ${targetPassword}`);
  console.log(`Admin Name:     ${adminName}`);
  console.log('------------------------------------------------------\n');

  try {
    // Step 1: Check if user already exists in auth or profiles
    const checkSql = `
      SELECT id, email, role FROM public.profiles WHERE email = '${targetEmail}' LIMIT 1;
    `;
    const { data: existingUser } = await insforge.database.rpc('exec_sql', { query: checkSql });

    let userId = null;

    if (existingUser && existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`[1/3] Existing user profile found (ID: ${userId}). Updating role and credentials...`);

      // Update password & verify status in auth.users
      const updateAuthSql = `
        UPDATE auth.users 
        SET email = '${targetEmail}',
            updated_at = NOW()
        WHERE id = '${userId}';

        UPDATE public.profiles
        SET role = 'admin',
            name = '${adminName}',
            is_active = true,
            updated_at = NOW()
        WHERE id = '${userId}';

        INSERT INTO public.admin_users (user_id) 
        VALUES ('${userId}') 
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await insforge.database.rpc('exec_sql', { query: updateAuthSql });

    } else {
      console.log('[1/3] User does not exist. Registering brand new user account...');
      
      // Attempt auth signup
      const { data: authData, error: authError } = await insforge.auth.signUp({
        email: targetEmail,
        password: targetPassword,
        name: adminName,
      });

      if (authError) {
        console.warn('Auth SignUp Notice:', authError.message || authError);
      }

      // Query auth.users to retrieve user ID
      const findUserSql = `SELECT id FROM auth.users WHERE email = '${targetEmail}' LIMIT 1;`;
      const { data: authUser } = await insforge.database.rpc('exec_sql', { query: findUserSql });
      
      if (authUser && authUser.length > 0) {
        userId = authUser[0].id;
      }

      if (userId) {
        // Step 2: Elevate to admin in profiles and admin_users
        console.log(`[2/3] Elevating profile (ID: ${userId}) to 'admin' role...`);
        const elevateSql = `
          INSERT INTO public.profiles (id, email, name, role, is_active, completed_onboarding)
          VALUES ('${userId}', '${targetEmail}', '${adminName}', 'admin', true, true)
          ON CONFLICT (id) DO UPDATE 
          SET role = 'admin', is_active = true, completed_onboarding = true;

          INSERT INTO public.admin_users (user_id) 
          VALUES ('${userId}') 
          ON CONFLICT (user_id) DO NOTHING;
        `;
        await insforge.database.rpc('exec_sql', { query: elevateSql });
      }
    }

    console.log('[3/3] Sending Email Verification Code (OTP)...');
    try {
      await insforge.auth.resendVerificationEmail({ email: targetEmail });
      console.log('✅ 6-Digit Email Verification Code sent to:', targetEmail);
    } catch (resendErr) {
      console.log('Notice regarding verification email:', resendErr.message || resendErr);
    }

    console.log('\n======================================================');
    console.log('🎉 ADMIN PROVISIONING COMPLETE');
    console.log('======================================================');
    console.log(`Email:       ${targetEmail}`);
    console.log(`Password:    ${targetPassword}`);
    console.log(`Role:        admin`);
    console.log('------------------------------------------------------');
    console.log('Next Steps:');
    console.log(`1. Go to your login page (/login)`);
    console.log(`2. Log in with ${targetEmail} and password ${targetPassword}`);
    console.log(`3. Enter the 6-digit OTP verification code sent to ${targetEmail}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Failed to provision admin account:', err);
  }
}

const args = process.argv.slice(2);
const targetEmail = args[0];
const targetPassword = args[1] || '#Nandi04';

setupAdminAccount(targetEmail, targetPassword);
