import { redirect } from 'next/navigation';

// Legacy admin-created-recruiter activation flow (doc 14: pipeline retired). Its
// activate-recruiter call produced recruiter state outside the request-access pipeline —
// the source of the orphaned-recruiter problem. Recruiters now onboard exclusively via
// /signup/recruiter → email verification → /onboarding/recruiter/setup.
// The activate-recruiter edge function stays deployed (doc 21 §4); only callers are removed.
export default function VerifyRecruiterPage() {
  redirect('/signup/recruiter');
}
