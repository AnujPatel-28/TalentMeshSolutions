/**
 * Erasure plan check.
 *
 * Guards doc 26 §4 L-4's hard requirement: "an erasure request for a user with an application
 * does not orphan or destroy recruiter-owned columns." Pure logic only, no live DB — see
 * lib/dpdp/erasure.ts for why every fact this asserts was verified against the live schema first.
 */
import { describe, it } from 'vitest';
import assert from 'node:assert';
import {
  ERASURE_PLAN,
  APPLICATIONS_CANDIDATE_OWNED_COLUMNS,
  APPLICATIONS_RECRUITER_OWNED_COLUMNS,
  planFor,
} from './erasure';

describe('DPDP erasure plan', () => {
  it('never deletes an identity row', () => {
    // Not a style preference: applications' two CASCADE FKs (candidate_id -> candidate_profiles
    // AND -> profiles) and jobs.recruiter_id's NOT NULL + SET NULL FK mean a delete on any of
    // these three tables either destroys applications or errors outright (migration 065 header).
    for (const identityTable of ['profiles', 'candidate_profiles', 'recruiter_profiles']) {
      const entry = ERASURE_PLAN.find((e) => e.target === identityTable);
      assert.ok(entry, `${identityTable} must have an explicit plan entry`);
      assert.notStrictEqual(entry!.action, 'delete', `${identityTable} must never be deleted`);
    }
  });

  it('clears candidate-owned application columns only', () => {
    const appsEntry = ERASURE_PLAN.find((e) => e.target === 'applications')!;
    assert.ok(appsEntry, 'applications must have a plan entry');
    assert.notStrictEqual(appsEntry.action, 'delete', 'applications rows must never be deleted');
    for (const col of appsEntry.columnsCleared ?? []) {
      assert.ok(
        (APPLICATIONS_CANDIDATE_OWNED_COLUMNS as readonly string[]).includes(col),
        `applications erasure must not clear non-candidate-owned column "${col}"`,
      );
      assert.ok(
        !(APPLICATIONS_RECRUITER_OWNED_COLUMNS as readonly string[]).includes(col),
        `applications erasure must not clear recruiter-owned column "${col}"`,
      );
    }
    // And every recruiter-owned column is absent, not just unlisted-by-omission.
    for (const col of APPLICATIONS_RECRUITER_OWNED_COLUMNS) {
      assert.ok(
        !(appsEntry.columnsCleared ?? []).includes(col),
        `recruiter-owned column "${col}" leaked into the erasure clear-list`,
      );
    }
  });

  it('keeps consent_records as the statutory proof of consent', () => {
    const consentEntry = ERASURE_PLAN.find((e) => e.target === 'consent_records')!;
    assert.strictEqual(consentEntry.action, 'keep');
  });

  it('keeps role-scoped plans disjoint from the other role identity table', () => {
    const candidatePlan = planFor('candidate');
    const recruiterPlan = planFor('recruiter');
    assert.ok(!candidatePlan.some((e) => e.target === 'recruiter_profiles'));
    assert.ok(!recruiterPlan.some((e) => e.target === 'candidate_profiles'));
    assert.ok(candidatePlan.some((e) => e.target === 'profiles'));
    assert.ok(recruiterPlan.some((e) => e.target === 'profiles'));
  });
});
