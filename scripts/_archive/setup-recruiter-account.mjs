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

async function setupRecruiterAccount(targetEmail, targetPassword = 'Password@123', recruiterName = 'Test Recruiter') {
  console.log('\n======================================================');
  console.log('TalentMesh Recruiter Account Provisioner');
  console.log('======================================================');
  
  try {
    const checkSql = `
      SELECT id, email, role FROM public.profiles WHERE email = '${targetEmail}' LIMIT 1;
    `;
    const { data: existingUser } = await insforge.database.rpc('exec_sql', { query: checkSql });

    let userId = null;

    if (existingUser && existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`[1/3] Existing user profile found (ID: ${userId}). Updating role...`);

      const updateAuthSql = `
        UPDATE public.profiles
        SET role = 'recruiter',
            name = '${recruiterName}',
            is_active = true,
            updated_at = NOW(),
            completed_onboarding = true
        WHERE id = '${userId}';
      `;
      await insforge.database.rpc('exec_sql', { query: updateAuthSql });

    } else {
      console.log('[1/3] Registering brand new user account...');
      
      const { data: authData, error: authError } = await insforge.auth.signUp({
        email: targetEmail,
        password: targetPassword,
        name: recruiterName,
      });

      if (authError) {
        console.warn('Auth SignUp Notice:', authError.message || authError);
      }

      const findUserSql = `SELECT id FROM auth.users WHERE email = '${targetEmail}' LIMIT 1;`;
      const { data: authUser } = await insforge.database.rpc('exec_sql', { query: findUserSql });
      
      if (authUser && authUser.length > 0) {
        userId = authUser[0].id;
      }

      if (userId) {
        console.log(`[2/3] Elevating profile (ID: ${userId}) to 'recruiter' role...`);
        const elevateSql = `
          INSERT INTO public.profiles (id, email, name, role, is_active, completed_onboarding)
          VALUES ('${userId}', '${targetEmail}', '${recruiterName}', 'recruiter', true, true)
          ON CONFLICT (id) DO UPDATE 
          SET role = 'recruiter', is_active = true, completed_onboarding = true;
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
    console.log('🎉 RECRUITER PROVISIONING COMPLETE');
    console.log('======================================================');
    console.log(`Email:       ${targetEmail}`);
    console.log(`Password:    ${targetPassword}`);
    console.log(`Role:        recruiter`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Failed to provision recruiter account:', err);
  }
}

const targetEmail = 'talentmeshdb+recruiter@gmail.com';
const targetPassword = 'Password@123';

setupRecruiterAccount(targetEmail, targetPassword);
