export function getRawCookieDomain(host: string): string | undefined {
  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
    return undefined;
  }
  
  const cleanHost = host.split(':')[0];
  const parts = cleanHost.split('.');
  
  // Prevent setting cookies on public suffixes like .vercel.app or .insforge.app
  if (cleanHost.endsWith('.vercel.app') || cleanHost.endsWith('.insforge.app') || cleanHost.endsWith('.netlify.app')) {
    if (parts.length >= 4) {
      return `.${parts.slice(-3).join('.')}`;
    }
    return undefined; // exact host match only
  }

  // Custom logic for qzz.io dynamic domain
  if (cleanHost.includes('.qzz.io')) {
    const qzzIndex = parts.indexOf('qzz');
    if (qzzIndex > 0) {
      return `.${parts.slice(qzzIndex - 1).join('.')}`;
    }
  }

  // Common second-level domains (e.g. .co.uk, .com.au)
  const commonSlds = ['co', 'com', 'org', 'net', 'edu', 'gov', 'mil', 'ac'];
  if (parts.length > 2 && commonSlds.includes(parts[parts.length - 2])) {
    return `.${parts.slice(-3).join('.')}`;
  }

  // Standard case (e.g. talentmeshsolutions.com)
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  
  return `.${parts.join('.')}`;
}

export function getCookieDomain(host: string) {
  const raw = getRawCookieDomain(host);
  return raw ? `; Domain=${raw}` : '';
}

/**
 * Cookies describing the *current session*: identity and routing metadata, all
 * issued at Path=/ by /api/auth/session. Safe to drop on a failed refresh —
 * insforge_refresh_token survives, so the session can be rebuilt.
 */
const SESSION_COOKIES: Array<{ name: string; paths: string[] }> = [
  { name: 'tm_access_token', paths: ['/'] },
  { name: 'tm_role', paths: ['/'] },
  { name: 'tm_admin_access', paths: ['/'] },
  { name: 'tm_onboarding', paths: ['/'] },
  { name: 'tm_mfa', paths: ['/'] },
  { name: 'tm_company', paths: ['/'] },
  { name: 'impersonating_user_id', paths: ['/'] },
  { name: 'impersonating_user_role', paths: ['/'] },
  { name: 'admin_user_id', paths: ['/'] },
];

/**
 * Long-lived credentials that can mint a *new* session. Only a real logout may
 * clear these — dropping them on a transient failure makes recovery impossible
 * and forces a re-login. Issued by the InsForge SDK under /api/auth;
 * insforge_csrf_token is also rewritten at Path=/ by saveCsrfToken().
 */
const CREDENTIAL_COOKIES: Array<{ name: string; paths: string[] }> = [
  { name: 'insforge_refresh_token', paths: ['/', '/api/auth'] },
  { name: 'insforge_csrf_token', paths: ['/', '/api/auth'] },
];

/**
 * Set-Cookie values that clear auth cookies, emitted both host-only and
 * domain-scoped. Writes are inconsistently scoped across the codebase — server
 * routes set Domain, the document.cookie writes in AuthContext do not — and a
 * domain-scoped delete will not remove a host-only cookie of the same name.
 *
 * scope 'session' drops the current session but leaves it recoverable via refresh.
 * scope 'all' additionally revokes the refresh credentials — logout only.
 */
export function buildAuthClearCookies(
  host: string,
  isSecure: boolean,
  scope: 'session' | 'all' = 'session'
): string[] {
  const sameSite = isSecure ? 'SameSite=None; Secure;' : 'SameSite=Lax;';
  const rawDomain = getRawCookieDomain(host);
  const scopes = rawDomain ? ['', `; Domain=${rawDomain}`] : [''];
  const targets = scope === 'all' ? [...SESSION_COOKIES, ...CREDENTIAL_COOKIES] : SESSION_COOKIES;

  const values: string[] = [];
  for (const { name, paths } of targets) {
    for (const path of paths) {
      for (const s of scopes) {
        values.push(
          `${name}=; Path=${path}; HttpOnly; ${sameSite} Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${s}`
        );
      }
    }
  }
  return values;
}
