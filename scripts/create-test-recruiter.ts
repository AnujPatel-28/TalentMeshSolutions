import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_SERVICE_KEY = process.env.INSFORGE_SERVICE_KEY;

if (!INSFORGE_URL || !INSFORGE_SERVICE_KEY) {
  console.error("Missing INSFORGE_URL or INSFORGE_SERVICE_KEY in .env");
  process.exit(1);
}

const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_SERVICE_KEY, // Service key grants admin privileges
  isServerMode: true,
});

async function main() {
  const email = "recruiter@example.com";
  const password = "password123";

  console.log(`Creating test recruiter: ${email}`);

  // 1. Create User
  const { data: authData, error: authError } = await insforge.auth.signUp({
    email,
    password,
    name: 'Test Recruiter',
  });

  let userId: string | undefined = authData?.user?.id;

  if (authError) {
    if (authError.message?.includes("already") || authError.message?.includes("exists")) {
      console.log("User already exists, attempting to find existing profile.");
      const { data: profile } = await insforge.database
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      userId = profile?.id;
    } else {
      console.error("Failed to create user:", authError);
      return;
    }
  }

  if (!userId) {
    console.error("Could not find or create user ID.");
    return;
  }

  const roleId = `recr_${Math.random().toString(36).substring(2, 10)}`;

  console.log(`User ID: ${userId}`);

  // 2. Ensure Profile exists
  const { error: profileError } = await insforge.database
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      name: 'Test Recruiter',
      role: 'recruiter',
      role_id: roleId,
      completed_onboarding: true
    });

  if (profileError) {
    console.error("Failed to upsert profile:", profileError);
    return;
  }

  // 3. Create dummy company if needed, or link to one.
  // We'll create a dummy company for the recruiter.
  const { data: companyData, error: companyError } = await insforge.database
    .from('companies')
    .upsert({
      name: 'Test Tech Company',
      website: 'https://testtech.example.com',
      industry: 'Technology',
      size: '51-200'
    })
    .select('id')
    .single();

  if (companyError && companyError.code !== '23505') { // Ignore unique constraint
    console.warn("Failed to create company (might already exist):", companyError);
  }

  // Get company ID
  const { data: fetchCompany } = await insforge.database
    .from('companies')
    .select('id')
    .eq('name', 'Test Tech Company')
    .single();
    
  const companyId = fetchCompany?.id;

  // 4. Create recruiter_profiles entry
  const { error: recruiterError } = await insforge.database
    .from('recruiter_profiles')
    .upsert({
      id: userId,
      company_id: companyId,
      job_title: 'Senior Technical Recruiter',
      department: 'HR',
      permissions: ['all']
    });

  if (recruiterError) {
    console.error("Failed to upsert recruiter profile:", recruiterError);
    return;
  }

  console.log("✅ Successfully created/updated test recruiter!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Company ID: ${companyId}`);
}

main().catch(console.error);
