// Doc 26 §4 L-4 erasure plan. Pure data + logic, no @insforge/sdk import, so this stays
// importable via `npx tsx` the same way lib/consent/withdraw.ts does (see erasure.test.ts).
// Execution against the live DB lives in lib/dpdp/execute-erasure.ts, which imports this file.
//
// ══ Why no table here ever deletes a profiles / candidate_profiles / recruiter_profiles row ═══
// Verified live 2026-07-29 (see insforge/migrations/065_data_principal_requests.sql header for
// the query): profiles.id has 46 live FK dependents.
//   * applications_candidate_id_fkey (-> candidate_profiles) and
//     applications_candidate_user_id_fkey (-> profiles) are BOTH ON DELETE CASCADE. Deleting
//     either identity row destroys the application row and the recruiter-owned columns on it
//     (stage_index, recruiter_notes, ai_match_score, rejection_reason, status) -- exactly what
//     doc 26 §4 says erasure must not do.
//   * jobs.recruiter_id is NOT NULL but its FK delete_rule is SET NULL: deleting a recruiter's
//     profiles row errors (constraint violation), it does not cascade. There is no delete-based
//     path for a recruiter with any job history.
export type ErasureAction = 'anonymise' | 'delete' | 'keep';
export type ErasureRole = 'candidate' | 'recruiter' | 'both';

export interface ErasurePlanEntry {
  target: string; // table name, or "storage:<bucket>" for a storage bucket
  action: ErasureAction;
  appliesTo: ErasureRole;
  reason: string;
  columnsCleared?: readonly string[];
}

// Candidate-owned application columns -- exactly the set 062 already restricts client UPDATE to
// (insforge/migrations/062_applications_column_privileges.sql). Recruiter-owned columns
// (status, stage_index, recruiter_notes, ai_match_score, rejection_reason) are deliberately
// absent and must never appear in an erasure column list.
export const APPLICATIONS_CANDIDATE_OWNED_COLUMNS = [
  'cover_letter',
  'resume_url',
  'resume_id',
  'resume_snapshot_key',
  'screening_answers',
] as const;

export const APPLICATIONS_RECRUITER_OWNED_COLUMNS = [
  'status',
  'stage_index',
  'recruiter_notes',
  'ai_match_score',
  'rejection_reason',
] as const;

export const CANDIDATE_PROFILE_COLUMNS_CLEARED = [
  'headline', 'skills', 'education', 'work_history', 'resume_url', 'linkedin_url',
  'github_url', 'portfolio_url', 'salary_min', 'salary_max', 'primary_resume_id', 'resume_path',
] as const;

export const RECRUITER_PROFILE_COLUMNS_CLEARED = [
  'about', 'document_url', 'pan_number', 'aadhaar_number', 'kyc_document_url',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_address',
] as const;

export const PROFILE_COLUMNS_CLEARED = [
  'name', 'phone', 'location', 'bio', 'avatar_url',
] as const;

// Execution order matters: candidate_resumes rows are deleted (and their storage objects) BEFORE
// applications is anonymised, because candidate_resumes' own ON DELETE SET NULL FKs
// (candidate_profiles.primary_resume_id, applications.resume_id) already null those references
// as a side effect -- the applications step then only has to clear the remaining text columns.
export const ERASURE_PLAN: ErasurePlanEntry[] = [
  {
    target: 'storage:resumes',
    action: 'delete',
    appliesTo: 'candidate',
    reason:
      'Synchronous hard delete (InsForge support, confirmed 2026-07-29): object bytes are never ' +
      'in DB backups, so this step alone satisfies the retention guarantee for résumé files. ' +
      'CDN edge cache may still serve an already-cached copy for up to the private-bucket TTL (≤1h).',
  },
  {
    target: 'candidate_resumes',
    action: 'delete',
    appliesTo: 'candidate',
    reason:
      'Pure candidate content, no recruiter-owned data anywhere on the row. ' +
      'candidate_profiles.primary_resume_id and applications.resume_id are both ON DELETE SET ' +
      'NULL, so deleting these rows cannot orphan or destroy any other row.',
  },
  {
    target: 'applications',
    action: 'anonymise',
    appliesTo: 'candidate',
    columnsCleared: APPLICATIONS_CANDIDATE_OWNED_COLUMNS,
    reason:
      'Row is never deleted (see file header). Only the candidate-owned columns (062\'s allow-' +
      'list) are cleared; status/stage_index/recruiter_notes/ai_match_score/rejection_reason are ' +
      'recruiter-owned and must survive untouched -- the recruiter\'s pipeline history is not the ' +
      'candidate\'s personal data to erase.',
  },
  {
    target: 'candidate_profiles',
    action: 'anonymise',
    appliesTo: 'candidate',
    columnsCleared: CANDIDATE_PROFILE_COLUMNS_CLEARED,
    reason:
      'Row is never deleted: applications.candidate_id -> candidate_profiles(id) ON DELETE ' +
      'CASCADE would destroy application rows (and the recruiter-owned columns on them) if this ' +
      'row were deleted. is_visible/is_discoverable are set false rather than the row removed.',
  },
  {
    target: 'recruiter_profiles',
    action: 'anonymise',
    appliesTo: 'recruiter',
    columnsCleared: RECRUITER_PROFILE_COLUMNS_CLEARED,
    reason:
      'jobs.recruiter_id is NOT NULL with an ON DELETE SET NULL FK: deleting a recruiter profile ' +
      'who has ever posted a job raises a NOT NULL constraint violation, not a cascade. ' +
      'Anonymise-in-place is the only path that does not error. pan_number/aadhaar_number/' +
      'kyc_document_url should already be NULL from migration 061; cleared again defensively.',
  },
  {
    target: 'profiles',
    action: 'anonymise',
    appliesTo: 'both',
    columnsCleared: PROFILE_COLUMNS_CLEARED,
    reason:
      '46 live FK dependents of profiles.id (migration 065 header), several ON DELETE CASCADE ' +
      'onto rows this erasure must not destroy (applications, offers, interviews, ' +
      'saved_candidates, recruiter_candidate_notes) and one (jobs.recruiter_id) that errors ' +
      'outright. is_active is set false to end the account without deleting the row. email is ' +
      'left as-is (not reused, and consent_records/data_principal_requests key off it).',
  },
  {
    target: 'storage:avatars',
    action: 'delete',
    appliesTo: 'both',
    reason: 'Avatar image is personal and unreferenced once profiles.avatar_url is cleared.',
  },
  {
    target: 'consent_records',
    action: 'keep',
    appliesTo: 'both',
    reason:
      'Append-only statutory evidence of lawful basis and consent history (063); must survive ' +
      'the account it documents. This is exactly why 065 changed its user_id FK from CASCADE to ' +
      'ON DELETE SET NULL.',
  },
];

export function planFor(role: 'candidate' | 'recruiter'): ErasurePlanEntry[] {
  return ERASURE_PLAN.filter((e) => e.appliesTo === role || e.appliesTo === 'both');
}
