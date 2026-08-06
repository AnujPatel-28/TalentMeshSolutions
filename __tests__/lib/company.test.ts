import { describe, it, expect } from 'vitest';

import {
  GSTIN,
  CIN,
  PAN,
  PHONE_IN,
  requestAccessSchema,
  verificationDecisionSchema,
  verificationQueueQuerySchema,
} from '@/lib/validation/company';

describe('India KYC regexes', () => {
  it('GSTIN', () => {
    expect(GSTIN.test('27AAPFU0939F1ZV')).toBe(true);
    expect(GSTIN.test('not-a-gstin')).toBe(false);
  });

  it('CIN', () => {
    expect(CIN.test('L17110MH1973PLC019786')).toBe(true);
    expect(CIN.test('not-a-cin')).toBe(false);
  });

  it('PAN', () => {
    expect(PAN.test('ABCDE1234F')).toBe(true);
    expect(PAN.test('not-a-pan')).toBe(false);
  });

  it('PHONE_IN', () => {
    expect(PHONE_IN.test('+919876543210')).toBe(true);
    expect(PHONE_IN.test('+911234567890')).toBe(false); // leading digit must be 6-9
  });
});

describe('P2-B route schemas', () => {
  // phone is required by requestAccessSchema on both the create and attach paths,
  // and superRefine'd against PHONE_IN when country_code defaults to 'IN'.
  const company = { name: 'Acme Hiring', industry: 'IT', phone: '+919876543210' };

  it('requestAccessSchema strips role/company_id — they can never come from the body', () => {
    const parsed = requestAccessSchema.parse({ ...company, role: 'admin', company_id: 'x' });
    expect(parsed).not.toHaveProperty('role');
    expect(parsed).not.toHaveProperty('company_id');
    expect(parsed.country_code).toBe('IN');
  });

  it('requestAccessSchema takes an optional uuid attach_company_id', () => {
    expect(requestAccessSchema.safeParse({ ...company, attach_company_id: 'not-a-uuid' }).success).toBe(false);
    expect(
      requestAccessSchema.safeParse({ ...company, attach_company_id: '11111111-1111-4111-8111-111111111111' }).success
    ).toBe(true);
  });

  it('verificationDecisionSchema accepts only the three RPC-backed decisions', () => {
    const request_id = '11111111-1111-4111-8111-111111111111';
    for (const decision of ['approved', 'rejected', 'needs_more_info']) {
      expect(verificationDecisionSchema.safeParse({ request_id, decision }).success).toBe(true);
    }
    expect(verificationDecisionSchema.safeParse({ request_id, decision: 'verified' }).success).toBe(false);
  });

  it('verificationQueueQuerySchema coerces page from the query string and defaults to 1', () => {
    expect(verificationQueueQuerySchema.parse({}).page).toBe(1);
    expect(verificationQueueQuerySchema.parse({ page: '3' }).page).toBe(3);
    expect(verificationQueueQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});
