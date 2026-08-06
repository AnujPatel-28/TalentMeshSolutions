import { describe, it, expect } from 'vitest';

import { isRecruiterApproved } from '@/lib/recruiter-approval';

describe('isRecruiterApproved', () => {
  it('denies when there is no company membership at all', () => {
    expect(isRecruiterApproved(null, null)).toBe(false);
  });

  it('denies when membership is not active', () => {
    expect(isRecruiterApproved({ status: 'invited' }, { status: 'verified' })).toBe(false);
  });

  it('denies when the company is not verified', () => {
    expect(isRecruiterApproved({ status: 'active' }, { status: 'pending' })).toBe(false);
  });

  it('allows when membership is active and the company is verified', () => {
    expect(isRecruiterApproved({ status: 'active' }, { status: 'verified' })).toBe(true);
  });
});
