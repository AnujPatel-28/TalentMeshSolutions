import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as crypto from 'crypto';

/**
 * Validate signed MFA verification cookie.
 * Returns true if the cookie is valid and recent (within 24 hours).
 */
function validateMfaCookie(mfaCookieValue: string, accessToken: string): boolean {
  try {
    const [signature, timestamp, factorId] = mfaCookieValue.split(':');
    if (!signature || !timestamp) return false;

    const now = Date.now();
    const ts = parseInt(timestamp, 10);

    // Check if timestamp is recent (within 24 hours)
    if (isNaN(ts) || Math.abs(now - ts) > 24 * 60 * 60 * 1000) {
      return false;
    }

    // Validate HMAC signature if factorId is present
    const mfaSecret = process.env.MFA_SIGNING_SECRET;
    if (!mfaSecret) {
      console.error('CRITICAL: MFA_SIGNING_SECRET is not set');
      return false;
    }
    
    if (!factorId) return false;

    const message = `${accessToken}:${factorId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', mfaSecret).update(message).digest('hex');
    if (signature.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (err) {
    return false;
  }
}

function rewrite(url: URL, request: NextRequest) {
  request.headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.rewrite(url, {
    request: {
      headers: request.headers,
    },
  });
}

function next(request: NextRequest) {
  request.headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

/**
 * Next.js 16 Proxy (formerly Middleware)
 * 
 * STATELESS — reads server-issued cookies as routing metadata only.
 * All authorization is enforced by getServerUser() in layout RSCs.
 * No database queries are made in this layer.
 */
export async function proxy(request: NextRequest) {
  request.headers.set('x-pathname', request.nextUrl.pathname);
  
  // Promote redirect depth query param to header
  const rd = request.nextUrl.searchParams.get('rd') || '0';
  request.headers.set('x-redirect-depth', rd);

  let token = request.headers.get('x-access-token') || request.cookies.get('tm_access_token')?.value;
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/tm_access_token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }
  if (token) {
    request.headers.set('x-access-token', token);
  }
  
  return await _proxy(request);
}

async function _proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass check for unauthorized page to prevent routing loops
  if (pathname === '/unauthorized') {
    return next(request);
  }

  // Terminate redirection loops early
  const rdStr = request.nextUrl.searchParams.get('rd');
  const rd = rdStr ? parseInt(rdStr, 10) : 0;
  if (rd > 3) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  const token = request.cookies.get('tm_access_token')?.value || request.headers.get('x-access-token') || undefined;

  // Validate signed MFA verification cookie (local crypto — no DB call)
  const mfaCookieValue = request.cookies.get('mfa_verified')?.value;
  const mfaVerified = mfaCookieValue && token ? validateMfaCookie(mfaCookieValue, token) : false;

  const isRsc = request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc');

  // --- Stateless cookie reads (routing metadata only) ---
  const isAuthenticated = !!token;
  const role = request.cookies.get('tm_role')?.value;
  const completedOnboarding = request.cookies.get('tm_onboarding')?.value === 'true';
  const mfaEnabled = request.cookies.get('tm_mfa')?.value === 'true';
  const companyId = request.cookies.get('tm_company')?.value;

  // Extract user ID from JWT payload (base64 decode only — no cryptographic validation).
  // This is safe because the layout layer validates the JWT authoritatively via getServerUser().
  let userId: string | undefined;
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        userId = payload.sub;
      }
    } catch {
      // Malformed token — userId stays undefined, layout will reject
    }
  }

  const isAdmin = ['admin', 'super_admin'].includes(role || '');
  const hasAdminAccessCookie = request.cookies.get('tm_admin_access')?.value === 'true';

  // Redirect unauthenticated requests to /pending-approval back to login
  if (!isAuthenticated && pathname === '/pending-approval') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle direct access to /pending-approval for logged in users.
  // Note: pending approval status is an authorization decision now handled by layouts.
  if (isAuthenticated && pathname === '/pending-approval') {
    if (role === 'recruiter') {
      return next(request);
    } else {
      const dest = (isAdmin || hasAdminAccessCookie)
        ? '/admin/dashboard'
        : role === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  const host = request.headers.get('host') || '';
  const isJobsPortal = host.startsWith('jobs.');
  const isAppPortal = host.startsWith('app.');
  const isAdminPortal = host.startsWith('admin.');
  const isLocalhostEnv = host.includes('localhost') || host.includes('127.0.0.1');
  const isTenantPortal = !isJobsPortal && !isAppPortal && !isAdminPortal && !isLocalhostEnv;

  const isStaticOrApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.');
  const isMainDomain = !isJobsPortal && !isAppPortal && !isAdminPortal;

  // '/admin/forgot-password' and '/admin/reset-password' must be listed: on the admin
  // subdomain every other '/admin/*' path is gated by isAdminPath below, which bounces
  // unauthenticated visitors to /login — and password recovery is exactly the case where
  // the visitor cannot be authenticated. The authenticated-admin redirect further down
  // already assumes these pages are reachable while logged out.
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/forgot-password', '/admin/forgot-password', '/admin/reset-password'];
  const isAuthCallback = pathname === '/auth/callback';
  const isAuthPage = authPages.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Auth flows that are reached while ALREADY holding a session: the invite
  // password-set page and the admin MFA challenge. They need the same exemption from
  // the portal gates that authPages get, but they must not join authPages — that list
  // also drives the "authenticated ⇒ send to dashboard" rule below, which would bounce
  // the very users these pages exist for (and, for MFA, redirect the challenge to itself).
  const isSessionAuthFlow = ['/auth/set-password', '/auth/mfa-verify']
    .some(p => pathname === p || pathname.startsWith(p + '/'));

  // Shared exemption for every portal gate: a subdomain must never swallow an auth flow.
  const isAuthFlow = isAuthPage || isAuthCallback || isSessionAuthFlow;

  // '/browse-jobs' is retained deliberately: the board moved to '/jobs' and next.config
  // 308s the old prefix, but keeping it public here means the redirect can never be
  // intercepted by the candidate-portal auth gate below, whatever the redirect/proxy order.
  const isPublicJobsPath = pathname.startsWith('/browse-jobs') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/company') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/employers') ||
    ['/privacy', '/terms', '/about', '/contact'].some(p => pathname.startsWith(p));

  const isCandidatePortal = pathname.startsWith('/candidate/dashboard') ||
    (isJobsPortal && !isStaticOrApi && !isPublicJobsPath && !isAuthFlow && !pathname.startsWith('/onboarding'));

  const isRecruiterPortal = pathname.startsWith('/recruiter/') || pathname === '/recruiter' ||
    (isAppPortal && !isStaticOrApi && !isAuthFlow && !pathname.startsWith('/onboarding'));

  // On localhost, subdomains don't resolve — skip cross-subdomain redirects entirely.
  if (isMainDomain && !isStaticOrApi && !isRsc && !isLocalhostEnv) {
    const isCandidatePath = pathname === '/candidate' || pathname.startsWith('/candidate/') || pathname === '/dashboard/candidate' || pathname.startsWith('/dashboard/candidate/') || pathname.startsWith('/onboarding/candidate');
    if (isCandidatePath) {
      const proto = request.url.startsWith('https') ? 'https://' : 'http://';
      const cleanHost = host.replace(/^www\./, '');
      let relative = pathname;
      if (pathname.startsWith('/dashboard/candidate')) {
        relative = pathname.substring('/dashboard/candidate'.length);
      } else if (pathname.startsWith('/candidate/dashboard')) {
        relative = pathname.substring('/candidate/dashboard'.length);
      } else if (pathname.startsWith('/candidate')) {
        relative = pathname.substring('/candidate'.length);
      } else if (pathname.startsWith('/onboarding/candidate')) {
        relative = pathname;
      }
      const newUrl = new URL(`${proto}jobs.${cleanHost}${relative || '/dashboard'}${request.nextUrl.search}`);
      return NextResponse.redirect(newUrl);
    }
    const isRecruiterPath = pathname === '/recruiter' || pathname.startsWith('/recruiter/') || pathname === '/dashboard/recruiter' || pathname.startsWith('/dashboard/recruiter/') || pathname.startsWith('/onboarding/recruiter');
    if (isRecruiterPath) {
      const proto = request.url.startsWith('https') ? 'https://' : 'http://';
      const cleanHost = host.replace(/^www\./, '');
      let relative = pathname;
      if (pathname.startsWith('/dashboard/recruiter')) {
        relative = pathname.substring('/dashboard/recruiter'.length);
      } else if (pathname.startsWith('/recruiter/dashboard')) {
        relative = pathname.substring('/recruiter/dashboard'.length);
      } else if (pathname.startsWith('/recruiter')) {
        relative = pathname.substring('/recruiter'.length);
      } else if (pathname.startsWith('/onboarding/recruiter')) {
        relative = pathname;
      }
      const newUrl = new URL(`${proto}app.${cleanHost}${relative || '/dashboard'}${request.nextUrl.search}`);
      return NextResponse.redirect(newUrl);
    }
    const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
    if (isAdminPath) {
      const proto = request.url.startsWith('https') ? 'https://' : 'http://';
      const cleanHost = host.replace(/^www\./, '');
      let relative = pathname;
      if (pathname.startsWith('/dashboard/admin')) {
        relative = pathname.substring('/dashboard/admin'.length);
      } else if (pathname.startsWith('/admin/dashboard')) {
        relative = pathname.substring('/admin/dashboard'.length);
      } else if (pathname.startsWith('/admin')) {
        relative = pathname.substring('/admin'.length);
      }
      const newUrl = new URL(`${proto}admin.${cleanHost}${relative || '/dashboard'}${request.nextUrl.search}`);
      return NextResponse.redirect(newUrl);
    }
  }

  // Enforce subdomain routing for portal subdomains when accessing wrong portal path
  if (!isMainDomain && !isStaticOrApi && !isRsc) {
    const proto = request.url.startsWith('https') ? 'https://' : 'http://';
    const cleanHost = host.replace(/^www\./, '').replace(/^(jobs|app|admin)\./, '');

    if (pathname.startsWith('/admin') && !isAdminPortal) {
      return NextResponse.redirect(new URL(`${proto}admin.${cleanHost}${pathname}${request.nextUrl.search}`));
    }
    if (pathname.startsWith('/dashboard/admin')) {
      const relativePath = pathname.substring('/dashboard/admin'.length);
      return NextResponse.redirect(new URL(`${proto}admin.${cleanHost}/admin/dashboard${relativePath}${request.nextUrl.search}`));
    }

    const isRecruiterPath = pathname === '/recruiter' || pathname.startsWith('/recruiter/') || pathname === '/onboarding/recruiter' || pathname.startsWith('/onboarding/recruiter/');
    if (isRecruiterPath && !isAppPortal) {
      return NextResponse.redirect(new URL(`${proto}app.${cleanHost}${pathname}${request.nextUrl.search}`));
    }
    if (pathname.startsWith('/dashboard/recruiter')) {
      let relativePath = pathname.substring('/dashboard/recruiter'.length);
      const segments = relativePath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0];
        if (firstSegment.startsWith('recr_') || firstSegment === userId || firstSegment.length > 15) {
          segments.shift();
        }
      }
      relativePath = segments.length > 0 ? '/' + segments.join('/') : '';
      return NextResponse.redirect(new URL(`${proto}app.${cleanHost}/recruiter/dashboard${relativePath}${request.nextUrl.search}`));
    }

    const isCandidatePath = pathname === '/candidate' || pathname.startsWith('/candidate/') || pathname === '/onboarding/candidate' || pathname.startsWith('/onboarding/candidate/');
    if (isCandidatePath && !isJobsPortal) {
      return NextResponse.redirect(new URL(`${proto}jobs.${cleanHost}${pathname}${request.nextUrl.search}`));
    }
    if (pathname.startsWith('/dashboard/candidate')) {
      let relativePath = pathname.substring('/dashboard/candidate'.length);
      const segments = relativePath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0];
        if (firstSegment.startsWith('cand_') || firstSegment === userId || firstSegment.length > 15) {
          segments.shift();
        }
      }
      relativePath = segments.length > 0 ? '/' + segments.join('/') : '';
      return NextResponse.redirect(new URL(`${proto}jobs.${cleanHost}/candidate/dashboard${relativePath}${request.nextUrl.search}`));
    }
  }

  // If accessing the app portal, enforce access
  // Recruiter portal un-gated (Phase 5): the coming-soon rewrite is removed now that the portal
  // is complete and security-verified (migrations 046-053, P0-2 guard, security regressions).
  // Static/API/RSC pass through (mirrors the routing guard above) so page assets load; real page
  // navigations get auth-enforced here plus the P0-2 RSC layout guard.
  if (isAppPortal && !isStaticOrApi && !isRsc) {
    if (!isAuthenticated && !isAuthFlow) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // /onboarding/recruiter/setup is the landing page for a freshly-verified recruiter registrant,
    // who is still role='candidate' until that step's POST /api/recruiter/request-access bumps them
    // (doc 20 §0.2). Without this carve-out the gate below fires first and the equivalent one in the
    // onboarding block never runs, making the whole onboarding flow unreachable on the app subdomain.
    const isRecruiterSetupPath = pathname === '/onboarding/recruiter/setup' || pathname.startsWith('/onboarding/recruiter/setup/');
    if (isAuthenticated && role !== 'recruiter' && !isAdmin && !isAuthPage && !isAuthCallback && !(isRecruiterSetupPath && role === 'candidate')) {
      const proto = request.url.startsWith('https') ? 'https://' : 'http://';
      return NextResponse.redirect(new URL(proto + 'jobs.' + host.replace('app.', '') + '/dashboard', request.url));
    }
  }

  const isDashboardPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/recruiter/dashboard') ||
    pathname.startsWith('/candidate/dashboard');

  // The RSC layer (app/dashboard/admin/layout.tsx) sends an authenticated-looking cookie
  // holder to /login in two cases the cookie-based isAuthenticated check can't see: a real
  // is_active=false suspension (reason=suspended, A-2), or getServerUser() rejecting the token
  // outright (?rd=N, the redirect-depth trail). Both mean "this session doesn't actually hold
  // up" — without this exemption isAuthenticated is still true (a cookie is present) and the
  // rule below immediately bounces the request straight back to the dashboard, which reruns the
  // same check and redirects here again. That loop also defeats the depth breaker at the top of
  // this function: every bounce goes through /admin/dashboard, a URL with no rd param, so the
  // header-promoted depth resets to 0 on every pass and rd>3 never fires. Net effect without
  // this exemption: ERR_TOO_MANY_REDIRECTS instead of ever reaching the login page. Found by
  // W9's e2e coverage.
  if (pathname === '/login' &&
      (request.nextUrl.searchParams.get('reason') === 'suspended' || request.nextUrl.searchParams.has('rd'))) {
    return next(request);
  }

  if (isAuthenticated && isAuthPage) {
    const dest = (isAdmin || hasAdminAccessCookie)
      ? '/admin/dashboard'
      : role === 'recruiter'
        ? '/recruiter/dashboard'
        : '/candidate/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isAuthenticated && isAdmin && ['/admin/forgot-password', '/admin/reset-password'].includes(pathname)) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Redirect legacy /dashboard/* routes to new structure
  if (!isRsc) {
    if (pathname.startsWith('/dashboard/admin')) {
      const relativePath = pathname.substring('/dashboard/admin'.length);
      return NextResponse.redirect(new URL(`/admin/dashboard${relativePath}`, request.url));
    }
    if (pathname.startsWith('/dashboard/recruiter')) {
      let relativePath = pathname.substring('/dashboard/recruiter'.length);
      const segments = relativePath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0];
        if (firstSegment.startsWith('recr_') || firstSegment === userId || firstSegment.length > 15) {
          segments.shift();
        }
      }
      relativePath = segments.length > 0 ? '/' + segments.join('/') : '';
      return NextResponse.redirect(new URL(`/recruiter/dashboard${relativePath}`, request.url));
    }
    if (pathname.startsWith('/dashboard/candidate')) {
      let relativePath = pathname.substring('/dashboard/candidate'.length);
      const segments = relativePath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0];
        if (firstSegment.startsWith('cand_') || firstSegment === userId || firstSegment.length > 15) {
          segments.shift();
        }
      }
      relativePath = segments.length > 0 ? '/' + segments.join('/') : '';
      return NextResponse.redirect(new URL(`/candidate/dashboard${relativePath}`, request.url));
    }
  }

  // Protect onboarding routes
  if (pathname.startsWith('/onboarding')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // If onboarding is already completed, redirect to the appropriate dashboard
    if (completedOnboarding) {
      const dest = (isAdmin || hasAdminAccessCookie)
        ? '/admin/dashboard'
        : role === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (pathname.startsWith('/onboarding/recruiter')) {
      // /setup is also the landing page for a freshly-verified recruiter registrant, who is
      // still role='candidate' until this step's POST /api/recruiter/request-access bumps them
      // (doc 20 §0.2) — that route's own allowedRoles is ['candidate','recruiter']. Every other
      // /onboarding/recruiter/* path stays recruiter-only.
      const isSetupPath = pathname === '/onboarding/recruiter/setup' || pathname.startsWith('/onboarding/recruiter/setup/');
      if (role !== 'recruiter' && !(isSetupPath && role === 'candidate')) {
        const dest = isAdmin ? '/admin/dashboard' : '/candidate/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    } else {
      if (role !== 'candidate') {
        const dest = isAdmin ? '/admin/dashboard' : '/recruiter/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  if (isDashboardPath || pathname.startsWith('/onboarding') || isCandidatePortal || isRecruiterPortal) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!completedOnboarding && !pathname.startsWith('/onboarding')) {
      if (role === 'candidate') {
        return NextResponse.redirect(new URL('/onboarding/candidate', request.url));
      } else if (role === 'recruiter') {
        return NextResponse.redirect(new URL('/onboarding/recruiter/setup', request.url));
      }
    }
  }

  // Handle direct access to /onboarding root
  if (pathname === '/onboarding') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role === 'recruiter') {
      return NextResponse.redirect(new URL('/onboarding/recruiter/setup', request.url));
    }
    if (role !== 'candidate') {
      const dest = isAdmin ? '/admin/dashboard' : '/recruiter/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL('/onboarding/candidate', request.url));
  }

  const isAdminPath = pathname.startsWith('/admin/dashboard') ||
    (isAdminPortal && !isAuthFlow && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/static'));

  if (isAdminPath) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!isAdmin && !hasAdminAccessCookie) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (mfaEnabled && !mfaVerified) {
      return NextResponse.redirect(new URL('/auth/mfa-verify', request.url));
    }

    let relativePath = pathname;
    if (pathname.startsWith('/admin/dashboard')) {
      relativePath = pathname.substring('/admin/dashboard'.length);
    } else if (isAdminPortal) {
      relativePath = pathname === '/' || pathname === '/dashboard' ? '' : pathname;
    }
    const targetPath = `/dashboard/admin${relativePath}`;
    return rewrite(new URL(targetPath, request.url), request);
  }

  const isRecruiterPath = isRecruiterPortal;
  if (isRecruiterPath) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!['recruiter', 'super_admin', 'admin'].includes(role ?? '')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    const recruiterId = userId || 'recruiter';

    let relativePath = pathname;
    if (pathname.startsWith('/recruiter/dashboard')) {
      relativePath = pathname.substring('/recruiter/dashboard'.length);
    } else if (pathname.startsWith('/recruiter')) {
      relativePath = pathname.substring('/recruiter'.length);
    } else if (isAppPortal) {
      relativePath = pathname === '/' || pathname === '/dashboard' ? '' : pathname;
    }

    const recSegments = relativePath.split('/').filter(Boolean);
    if (recSegments.length > 0) {
      const firstSegment = recSegments[0];
      if (
        firstSegment.startsWith('recr_') ||
        firstSegment === userId ||
        firstSegment === recruiterId ||
        firstSegment.length > 15
      ) {
        recSegments.shift();
      }
    }
    relativePath = recSegments.length > 0 ? '/' + recSegments.join('/') : '';

    // Everything serves from /dashboard/recruiter/[role_id]/*, which is the only recruiter tree
    // with layout guards. NVite, Offers and job detail used to be rewritten to
    // /company/[companyId]/recruiter/[recruiterId]/* instead — a tree with no layout.tsx anywhere
    // in its ancestry, so the role, active-membership, company-verified, suspension and MFA checks
    // in app/dashboard/layout.tsx and app/dashboard/recruiter/[role_id]/layout.tsx never ran for
    // those three route families. That is exactly the bounce doc 34 suite B1 tests for.
    const targetPath = `/dashboard/recruiter/${recruiterId}${relativePath}`;

    return rewrite(new URL(targetPath, request.url), request);
  }

  const isCandidatePath = isCandidatePortal;
  if (isCandidatePath) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isAdmin || role === 'recruiter') {
      const dest = isAdmin ? '/admin/dashboard' : '/recruiter/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    const candidateId = userId || 'candidate';

    let relativePath = pathname;
    if (pathname.startsWith('/candidate/dashboard')) {
      relativePath = pathname.substring('/candidate/dashboard'.length);
    } else if (isJobsPortal) {
      relativePath = pathname === '/' || pathname === '/dashboard' ? '' : pathname;
    }

    const candSegments = relativePath.split('/').filter(Boolean);
    if (candSegments.length > 0) {
      const firstSegment = candSegments[0];
      if (
        firstSegment.startsWith('cand_') ||
        firstSegment === userId ||
        firstSegment === candidateId ||
        firstSegment.length > 15
      ) {
        candSegments.shift();
      }
    }
    relativePath = candSegments.length > 0 ? '/' + candSegments.join('/') : '';

    const targetPath = `/dashboard/candidate/${candidateId}${relativePath}`;
    return rewrite(new URL(targetPath, request.url), request);
  }

  if (pathname === '/dashboard') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const dest = (isAdmin || hasAdminAccessCookie)
      ? '/admin/dashboard'
      : role === 'recruiter'
        ? '/recruiter/dashboard'
        : '/candidate/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Security: Global Admin API Protection
  if (pathname.startsWith('/api/admin') && !isAdmin && !hasAdminAccessCookie) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return next(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
