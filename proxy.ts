import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is the marketing site only — the recruiter/candidate/admin product portals and
// their backend live elsewhere. Legacy deep links to those routes redirect home instead
// of 404ing.
const REMOVED_PORTAL_PREFIXES = [
  '/admin', '/dashboard', '/recruiter', '/candidate', '/onboarding', '/company',
  '/auth', '/newsletter', '/unauthorized', '/debug-ai', '/signup', '/verify-recruiter',
  '/pending-approval', '/forgot-password', '/reset-password', '/jobs',
  // Not deleted — just disabled (app/_browse-jobs,
  // app/portals/jobs/_podcast) while being reworked locally. Stray links elsewhere on
  // the site still point here; redirect home instead of 404ing until they're live again.
  '/browse-jobs', '/portals/jobs/podcast', '/podcast',
  // Deleted routes — pages removed, keep redirecting home for SEO / stale links.
  // NOTE: '/employers' itself is handled as exact-match below so that
  // '/employers/post-job' (still live) is NOT redirected.
  '/employers/products', '/employers/rpo',
  '/privacy', '/terms',
  // TEMP-HIDDEN — page.tsx renamed to page.tsx.hidden while it's reworked
  // locally (see app/sitemap.ts). Remove from this list once it's restored.
  '/employers/sourcing',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deleted top-level routes (exact match only — children like
  // /employers/post-job must stay live).
  if (!pathname.includes('.') && pathname === '/employers') {
    return NextResponse.redirect(new URL('/', request.url), 308);
  }

  // Legacy about URL now lives at top-level /about.
  if (!pathname.includes('.') && (pathname === '/portals/jobs/about' || pathname.startsWith('/portals/jobs/about/'))) {
    return NextResponse.redirect(new URL('/about', request.url), 308);
  }

  // Legacy career-advice URL now lives at top-level /career-advice.
  if (!pathname.includes('.') && (pathname === '/portals/jobs/career-advice' || pathname.startsWith('/portals/jobs/career-advice/'))) {
    return NextResponse.redirect(new URL('/career-advice', request.url), 308);
  }

  const isAsset = pathname.startsWith('/_next') || pathname.includes('.');

  if (!isAsset && REMOVED_PORTAL_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/', request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
