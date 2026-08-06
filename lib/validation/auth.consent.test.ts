/**
 * Consent capture check.
 *
 * Guards doc 26 L-2 (consent capture) / L-11 (18+ age gate): signup must reject a missing
 * age attestation or a missing required consent, and must accept marketing_email left unticked.
 */
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { signupSchema } from './auth';

const basePayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Correct-Horse9',
  role: 'candidate' as const,
};

const validConsents = {
  terms_of_service: true,
  account_processing: true,
  age_18_plus: true,
  marketing_email: false,
  profile_visible_to_recruiters: true,
};

describe('signup consent capture', () => {
  it('accepts a fully valid payload', () => {
    assert.strictEqual(signupSchema.safeParse({ ...basePayload, consents: validConsents }).success, true);
  });

  it('rejects a missing age_18_plus attestation', () => {
    assert.strictEqual(
      signupSchema.safeParse({ ...basePayload, consents: { ...validConsents, age_18_plus: false } }).success,
      false
    );
  });

  it('rejects a missing required consent purpose', () => {
    assert.strictEqual(
      signupSchema.safeParse({ ...basePayload, consents: { ...validConsents, account_processing: false } }).success,
      false
    );
  });

  it('does not block signup on marketing_email, the one optional purpose', () => {
    assert.strictEqual(
      signupSchema.safeParse({ ...basePayload, consents: { ...validConsents, marketing_email: false } }).success,
      true
    );
  });
});
