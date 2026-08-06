import type { ConsentPurpose } from './copy';

// Doc 26 §4 L-3: withdrawal must be as easy as giving consent, but not every granted purpose is
// withdrawable — account_processing/terms_of_service/age_18_plus can only be revoked by deleting
// the account (L-4 erasure). resume_parsing_ai and analytics_cookies are excluded for the same
// reason lib/consent/copy.ts excludes them from signup: those features do not run today, so a
// withdraw control for them would be as misleading as a consent checkbox for them.
export const WITHDRAWABLE_PURPOSES = ['profile_visible_to_recruiters', 'marketing_email'] as const;
export type WithdrawablePurpose = (typeof WITHDRAWABLE_PURPOSES)[number];

export function isWithdrawable(purpose: string): purpose is WithdrawablePurpose {
  return (WITHDRAWABLE_PURPOSES as readonly string[]).includes(purpose);
}

// Shown for the three purposes that are required at signup and cannot be withdrawn individually.
export const NON_WITHDRAWABLE_REASON: Record<Exclude<ConsentPurpose, WithdrawablePurpose>, string> = {
  account_processing: 'Required to operate your account. Withdrawing means deleting your account.',
  terms_of_service: 'Required to operate your account. Withdrawing means deleting your account.',
  age_18_plus: 'Required to operate your account. Withdrawing means deleting your account.',
};

// What a purpose defaults to when consent_records has no row for it yet — signup only inserts a
// row for a GRANTED purpose (see app/api/auth/signup/route.ts's grantedPurposes filter), so an
// absent row is not neutral: for a required-at-signup purpose it means "granted, just before
// migration 063 existed"; for an opt-in purpose it means "never opted in".
const DEFAULT_STATUS: Record<WithdrawablePurpose, 'granted' | 'withdrawn'> = {
  profile_visible_to_recruiters: 'granted',
  marketing_email: 'withdrawn',
};

export interface ConsentRow {
  purpose: string;
  status: 'granted' | 'withdrawn';
  created_at: string;
}

// Doc 26 §5: "current state for a purpose = latest row by created_at for that (user_id, purpose)."
export function latestStatusByPurpose(rows: ConsentRow[]): Record<string, 'granted' | 'withdrawn'> {
  const latest: Record<string, ConsentRow> = {};
  for (const row of rows) {
    const existing = latest[row.purpose];
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      latest[row.purpose] = row;
    }
  }
  const result: Record<string, 'granted' | 'withdrawn'> = {};
  for (const [purpose, row] of Object.entries(latest)) {
    result[purpose] = row.status;
  }
  return result;
}

export function currentStatus(rows: ConsentRow[], purpose: WithdrawablePurpose): 'granted' | 'withdrawn' {
  return latestStatusByPurpose(rows)[purpose] ?? DEFAULT_STATUS[purpose];
}
