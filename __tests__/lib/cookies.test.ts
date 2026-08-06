import { describe, it, expect } from 'vitest';

import { getRawCookieDomain } from '@/lib/cookies';

/**
 * The single HttpOnly token cookie is shared across jobs./app./admin. only if its Domain
 * attribute is the registrable parent. If this drifts, every subdomain silently loses the
 * session and reads degrade to anon ("logged in but no data").
 * See 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4.1 S2.
 */
describe('getRawCookieDomain', () => {
  it('scopes the cookie to the parent domain for every portal subdomain', () => {
    const parent = '.talentmeshsolutions.com';

    expect(getRawCookieDomain('talentmeshsolutions.com')).toBe(parent);
    expect(getRawCookieDomain('jobs.talentmeshsolutions.com')).toBe(parent);
    expect(getRawCookieDomain('app.talentmeshsolutions.com')).toBe(parent);
    expect(getRawCookieDomain('admin.talentmeshsolutions.com')).toBe(parent);
  });

  it('ignores the port when deriving the domain', () => {
    expect(getRawCookieDomain('jobs.talentmeshsolutions.com:443')).toBe('.talentmeshsolutions.com');
  });

  it('returns undefined on localhost so the browser accepts a host-only cookie', () => {
    expect(getRawCookieDomain('localhost:3000')).toBeUndefined();
    expect(getRawCookieDomain('127.0.0.1:3000')).toBeUndefined();
    expect(getRawCookieDomain('')).toBeUndefined();
  });

  it('never scopes a cookie to a public suffix', () => {
    // A cookie on .vercel.app would be sent to every other tenant on the platform.
    expect(getRawCookieDomain('talentmesh.vercel.app')).toBeUndefined();
    expect(getRawCookieDomain('preview.talentmesh.vercel.app')).toBe('.talentmesh.vercel.app');
  });
});
