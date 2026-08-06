// Source of truth for "is this recruiter approved": company_members.status +
// companies.status (doc 14 killed the legacy recruiter_profiles.is_approved pipeline).
// Absence of a row must never mean approved — every branch here fails closed.
export function isRecruiterApproved(
  member: { status: string } | null | undefined,
  company: { status: string } | null | undefined
): boolean {
  return !!member && member.status === 'active' && !!company && company.status === 'verified';
}
