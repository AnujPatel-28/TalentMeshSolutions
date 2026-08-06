// Single source of truth for signup consent microcopy. The exact strings here are what gets
// rendered in the signup forms AND what app/api/auth/signup/route.ts hashes into
// consent_records.notice_hash — keeping both in one place is what makes "hash of the exact
// text displayed" (doc 26 §5) true instead of aspirational.
//
// resume_parsing_ai and analytics_cookies exist as consent_purpose_check enum values
// (insforge/migrations/063_consent_records.sql) but are deliberately NOT listed here: doc 26 §11
// says résumé parsing does not run today, so a consent box for it would be misleading; the same
// applies to any analytics/cookies UI, which does not exist yet either.

export const CONSENT_NOTICE_VERSION = 'signup-2026-07-28';

export type ConsentPurpose =
  | 'terms_of_service'
  | 'account_processing'
  | 'profile_visible_to_recruiters'
  | 'marketing_email'
  | 'age_18_plus';

export const CONSENT_COPY: Record<ConsentPurpose, string> = {
  terms_of_service: 'I have read and agree to the Terms of Service.',
  account_processing: 'I consent to TalentMesh processing my personal data to create and operate my account.',
  profile_visible_to_recruiters: 'I consent to my candidate profile being visible to recruiters on TalentMesh.',
  marketing_email: 'I would like to receive marketing and product update emails from TalentMesh (optional).',
  age_18_plus: 'I confirm that I am 18 years of age or older.',
};
