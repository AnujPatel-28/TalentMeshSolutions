import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is the marketing site only — the recruiter/candidate/admin product portals and
// their backend live elsewhere. Legacy deep links to those routes redirect home instead
// of 404ing.
const REMOVED_PORTAL_PREFIXES = [
  '/admin', '/dashboard', '/recruiter', '/candidate', '/onboarding', '/company',
  '/auth', '/newsletter', '/unauthorized', '/debug-ai', '/signup', '/verify-recruiter',
  '/pending-approval', '/forgot-password', '/reset-password', '/jobs',
  // Not deleted — just disabled (app/_browse-jobs, app/portals/jobs/_about,
  // app/portals/jobs/_podcast) while being reworked locally. Stray links elsewhere on
  // the site still point here; redirect home instead of 404ing until they're live again.
  '/browse-jobs', '/about', '/portals/jobs/about', '/podcast', '/portals/jobs/podcast',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAsset = pathname.startsWith('/_next') || pathname.includes('.');

  if (!isAsset && REMOVED_PORTAL_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  request.headers.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
