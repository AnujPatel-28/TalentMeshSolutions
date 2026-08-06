/**
 * Password policy check.
 *
 * Guards the client rules against the InsForge auth config (Auth Settings > Password):
 * min length 12, requiring number + special + lowercase + uppercase. If the server
 * policy is changed, update PASSWORD_MIN_LENGTH/passwordSchema and this file together.
 */
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { validateNewPassword, loginSchema, PASSWORD_MIN_LENGTH } from './auth';

describe('password policy', () => {
  it('pins the minimum length to the InsForge auth config', () => {
    assert.strictEqual(PASSWORD_MIN_LENGTH, 12);
  });

  it('accepts a password satisfying every rule', () => {
    assert.strictEqual(validateNewPassword('Correct-Horse9'), null);
  });

  it('rejects one missing rule at a time', () => {
    assert.match(validateNewPassword('Short1!a') ?? '', /at least 12/);
    assert.match(validateNewPassword('nouppercase9!xx') ?? '', /uppercase/);
    assert.match(validateNewPassword('NOLOWERCASE9!XX') ?? '', /lowercase/);
    assert.match(validateNewPassword('NoDigitsHere!xx') ?? '', /number/);
    assert.match(validateNewPassword('NoSpecialChar9xx') ?? '', /special/);
  });

  it('does not apply the policy at sign-in', () => {
    // Passwords created under the old 8-char rule have to keep working, so only
    // presence is required.
    assert.strictEqual(loginSchema.safeParse({ email: 'a@b.com', password: 'old8char' }).success, true);
    assert.strictEqual(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
  });
});
