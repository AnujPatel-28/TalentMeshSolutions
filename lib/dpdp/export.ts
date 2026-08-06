// Doc 26 §4 L-4: "Access = machine-readable export of the requester's data across profiles,
// candidate_profiles, applications, candidate_resumes, consent_records, and storage objects."
// Called by GET /api/dpdp/export — self-service, own data only, no staff action required (unlike
// correction/erasure, an access request needs no case-by-case judgment call to fulfil).
import { insforgeAdmin } from '@/lib/insforge-admin';
import { fetchConsentRows } from '@/lib/consent/withdraw-db';
import { APPLICATIONS_CANDIDATE_OWNED_COLUMNS } from './erasure';

// Recruiter-owned safe columns only — explicit allow-list, never `select('*')`. pan_number,
// aadhaar_number, document_url and kyc_document_url are deliberately excluded: migration 061
// nulled them with a bare UPDATE (no WHERE), so any row written since could hold live values, and
// shipping a live Aadhaar/PAN number or an ID-document link into a downloadable JSON export is a
// worse outcome than the requester not seeing those specific fields.
const RECRUITER_EXPORT_COLUMNS =
  'id, company_id, job_title, department, about, recruiter_role, is_approved, approved_at, ' +
  'updated_at, emergency_contact_name, emergency_contact_phone, emergency_contact_address';

export async function buildDataExport(userId: string, email: string, role: 'candidate' | 'recruiter') {
  if (!insforgeAdmin) throw new Error('Service key not configured');
  const db = insforgeAdmin.database;

  const [{ data: profile }, consentRows, { data: dpdpRequests }] = await Promise.all([
    db.from('profiles')
      .select('id, email, name, phone, location, bio, role, created_at, avatar_url, is_active, completed_onboarding')
      .eq('id', userId).single(),
    fetchConsentRows(userId, email),
    db.from('data_principal_requests')
      .select('id, kind, status, details, response_notes, due_at, created_at, completed_at')
      .eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const exportData: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    profile,
    consent_history: consentRows,
    data_principal_requests: dpdpRequests ?? [],
  };

  if (role === 'candidate') {
    const [{ data: candidateProfile }, { data: applications }, { data: resumes }] = await Promise.all([
      db.from('candidate_profiles').select('*').eq('id', userId).single(),
      db.from('applications')
        .select(`id, job_id, status, applied_at, updated_at, ${APPLICATIONS_CANDIDATE_OWNED_COLUMNS.join(', ')}`)
        .eq('candidate_id', userId),
      db.from('candidate_resumes')
        .select('id, label, file_url, file_name, file_size_bytes, is_default, created_at')
        .eq('candidate_id', userId),
    ]);
    exportData.candidate_profile = candidateProfile;
    // applications.status/updated_at are included (candidate needs to know their own pipeline
    // state); recruiter_notes/stage_index/ai_match_score/rejection_reason are excluded — that is
    // the recruiter's private assessment of the candidate, not the candidate's personal data.
    exportData.applications = applications ?? [];
    exportData.resumes = resumes ?? [];
  } else {
    const { data: recruiterProfile } = await db
      .from('recruiter_profiles')
      .select(RECRUITER_EXPORT_COLUMNS)
      .eq('id', userId)
      .single();
    exportData.recruiter_profile = recruiterProfile;
  }

  return exportData;
}
