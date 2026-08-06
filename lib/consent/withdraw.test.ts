/**
 * Consent withdrawal check.
 *
 * Guards doc 26 L-3: latest-row-wins, a non-withdrawable purpose is rejected, and
 * withdraw-then-regrant returns to granted. Pure logic only — consent_records has 0 live rows
 * (nobody has signed up since migration 063 was applied), so this can't lean on fixture data.
 */
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { isWithdrawable, latestStatusByPurpose, currentStatus, type ConsentRow } from './withdraw';

describe('consent withdrawal', () => {
  it('rejects non-withdrawable purposes', () => {
    assert.strictEqual(isWithdrawable('account_processing'), false);
    assert.strictEqual(isWithdrawable('terms_of_service'), false);
    assert.strictEqual(isWithdrawable('age_18_plus'), false);
    assert.strictEqual(isWithdrawable('resume_parsing_ai'), false);
    assert.strictEqual(isWithdrawable('analytics_cookies'), false);
  });

  it('accepts withdrawable purposes', () => {
    assert.strictEqual(isWithdrawable('marketing_email'), true);
    assert.strictEqual(isWithdrawable('profile_visible_to_recruiters'), true);
  });

  it('applies latest-row-wins regardless of insertion order', () => {
    const outOfOrder: ConsentRow[] = [
      { purpose: 'marketing_email', status: 'withdrawn', created_at: '2026-07-29T10:00:00Z' },
      { purpose: 'marketing_email', status: 'granted', created_at: '2026-07-28T10:00:00Z' },
    ];
    assert.strictEqual(latestStatusByPurpose(outOfOrder).marketing_email, 'withdrawn');
  });

  it('returns to granted after withdraw-then-regrant', () => {
    const grantWithdrawRegrant: ConsentRow[] = [
      { purpose: 'marketing_email', status: 'granted', created_at: '2026-07-27T10:00:00Z' },
      { purpose: 'marketing_email', status: 'withdrawn', created_at: '2026-07-28T10:00:00Z' },
      { purpose: 'marketing_email', status: 'granted', created_at: '2026-07-29T10:00:00Z' },
    ];
    assert.strictEqual(currentStatus(grantWithdrawRegrant, 'marketing_email'), 'granted');
  });

  it('defaults correctly when no rows exist', () => {
    // profile_visible_to_recruiters defaults granted (required at signup);
    // marketing_email defaults withdrawn (opt-in, absence means never opted in).
    assert.strictEqual(currentStatus([], 'profile_visible_to_recruiters'), 'granted');
    assert.strictEqual(currentStatus([], 'marketing_email'), 'withdrawn');
  });
});
