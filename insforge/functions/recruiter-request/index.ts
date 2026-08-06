// @ts-nocheck
import { createClient } from 'npm:@insforge/sdk';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY')!;

// Fast native base64 decoder helper to prevent Deno CPU timeout for large files
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin') || 'http://localhost:3000';
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const { 
      full_name, company_name, company_website, industry, company_size, 
      company_address, company_gstin, company_tan,
      work_email, phone_number, role_in_company, num_roles, 
      hiring_categories, hiring_timeline, additional_notes, request_type,
      document_base64, document_name, password,
      pan_number, aadhaar_number,
      emergency_contact_name, emergency_contact_phone, emergency_contact_address,
      kyc_document_base64, kyc_document_name,
      company_logo_base64, company_logo_name
    } = body;

    console.log("recruiter-request received email:", work_email);

    const insforge = createClient({ 
      baseUrl, 
      anonKey: serviceKey,
      edgeFunctionToken: serviceKey,
      isServerMode: true 
    });

    let profileId = null;
    let isExistingHalfCreated = false;

    // Check if the email is already registered in profiles to avoid confusing errors
    const { data: existingProfile } = await insforge.database
      .from('profiles')
      .select('id, role, status')
      .eq('email', work_email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      // Check if recruiter profile exists
      const { data: recProfile } = await insforge.database
        .from('recruiter_profiles')
        .select('id')
        .eq('id', existingProfile.id)
        .maybeSingle();

      if (recProfile) {
        if (existingProfile.status === 'active') {
          return new Response(JSON.stringify({ error: 'This email is already registered as an active recruiter. Please log in.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        } else {
          return new Response(JSON.stringify({ error: 'You have already submitted an access request. It is currently pending review.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      } else {
        // Recruiter profile doesn't exist. This is a half-created state.
        profileId = existingProfile.id;
        isExistingHalfCreated = true;
        console.log("Proceeding to complete half-created profile for:", work_email);
      }
    }

    let document_url = null;
    let kyc_document_url = null;
    let company_logo_url = null;

    // 1. Handle File Upload if present
    if (document_base64 && document_name) {
      // Decode base64
      const fileBuffer = decodeBase64(document_base64.split(',')[1]);
      const fileName = `${Date.now()}_${document_name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const file = new File([fileBuffer as any], fileName, { type: 'application/octet-stream' });
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from('recruiter_documents')
        .upload(fileName, file as any);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload verification document: " + uploadError.message);
      }

      // Get public URL
      document_url = insforge.storage
        .from('recruiter_documents')
        .getPublicUrl(fileName) as unknown as string;
    }

    // Handle KYC File Upload if present
    if (kyc_document_base64 && kyc_document_name) {
      // Decode base64
      const fileBuffer = decodeBase64(kyc_document_base64.split(',')[1]);
      const fileName = `kyc_${Date.now()}_${kyc_document_name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const file = new File([fileBuffer as any], fileName, { type: 'application/octet-stream' });
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from('recruiter_documents')
        .upload(fileName, file as any);

      if (uploadError) {
        console.error("KYC Upload error:", uploadError);
        throw new Error("Failed to upload KYC document: " + uploadError.message);
      }

      // Get public URL
      kyc_document_url = insforge.storage
        .from('recruiter_documents')
        .getPublicUrl(fileName) as unknown as string;
    }

    // Handle Company Logo File Upload if present
    if (company_logo_base64 && company_logo_name) {
      // Decode base64
      const fileBuffer = decodeBase64(company_logo_base64.split(',')[1]);
      const fileName = `logo_${Date.now()}_${company_logo_name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const file = new File([fileBuffer as any], fileName, { type: 'application/octet-stream' });
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from('company-logos')
        .upload(fileName, file as any);

      if (uploadError) {
        console.error("Company Logo Upload error:", uploadError);
        throw new Error("Failed to upload company logo: " + uploadError.message);
      }

      // Store relative key
      company_logo_url = fileName;
    }

    // Try to find if company already exists, else create it
    let companyId = null;
    if (company_name) {
      const { data: existingCompany } = await insforge.database
        .from('companies')
        .select('id')
        .eq('name', company_name)
        .single();
      
      companyId = existingCompany?.id;

      const kycDocs = document_url ? [{ url: document_url, name: document_name || 'company_verification_document' }] : null;

      if (!companyId) {
        const { data: newCompany, error: companyError } = await insforge.database
          .from('companies')
          .insert({
            name: company_name,
            website: company_website,
            industry: industry,
            size: company_size,
            location: company_address,
            gstin: company_gstin,
            tan: company_tan,
            kyc_documents: kycDocs,
            logo_url: company_logo_url
          })
          .select('id')
          .single();
        
        if (!companyError && newCompany) {
          companyId = newCompany.id;
        }
      } else {
        await insforge.database
          .from('companies')
          .update({
            location: company_address,
            gstin: company_gstin,
            tan: company_tan,
            kyc_documents: kycDocs,
            logo_url: company_logo_url || undefined
          })
          .eq('id', companyId);
      }
    }

    if (!isExistingHalfCreated) {
      // 2. Create the Auth User in InsForge with a temporary password
      // (The admin will set the real password during the Approve & Setup flow)
      const tempPassword = password || (crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!');

      const { data: signupData, error: signupError } = await insforge.auth.signUp({
        email: work_email,
        password: tempPassword,
        name: full_name
      });

      if (signupError) {
        throw new Error("Failed to register account: " + signupError.message);
      }

      let authUser = signupData?.user || (signupData as any)?.session?.user;
      if (!authUser) {
        // If requireEmailVerification is true, signUp succeeds but returns no user in the response data.
        // We look up the newly created profile by email (with a retry in case of trigger delay).
        let newProfile = null;
        let getProfileErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await insforge.database
            .from('profiles')
            .select('id')
            .eq('email', work_email.toLowerCase())
            .maybeSingle();
          newProfile = data;
          getProfileErr = error;
          if (newProfile) break;
          // Wait 250ms before retrying
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        if (newProfile) {
          profileId = newProfile.id;
        } else {
          console.error("Signup succeeded but failed to retrieve profile for:", work_email, getProfileErr);
          return new Response(JSON.stringify({ error: 'This email is already registered. Please log in or use a different email.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      } else {
        profileId = authUser.id;
      }
    }

    // Upsert the profile entry linked to the Auth User ID
    const { error: profileError } = await insforge.database
      .from('profiles')
      .upsert({
        id: profileId,
        email: work_email,
        name: full_name,
        role: 'recruiter',
        phone: phone_number,
        status: 'pending',
        completed_onboarding: true
      });

    if (profileError) throw new Error("Failed to update profile: " + profileError.message);

    // 3. Upsert recruiter_profiles record
    const { error: recruiterError } = await insforge.database
      .from('recruiter_profiles')
      .upsert({
        id: profileId,
        company_id: companyId,
        job_title: role_in_company,
        about: `Open Roles: ${num_roles || ''}\nTimeline: ${hiring_timeline || ''}\nNotes: ${additional_notes || ''}\nCategories: ${hiring_categories?.join(', ') || ''}`,
        is_approved: false,
        document_url: document_url,
        pan_number: pan_number,
        aadhaar_number: aadhaar_number,
        emergency_contact_name: emergency_contact_name,
        emergency_contact_phone: emergency_contact_phone,
        emergency_contact_address: emergency_contact_address,
        kyc_document_url: kyc_document_url
      });

    if (recruiterError) throw new Error("Failed to create recruiter profile: " + recruiterError.message);

    return new Response(JSON.stringify({ success: true, message: 'Request submitted successfully' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Recruiter Request Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}
