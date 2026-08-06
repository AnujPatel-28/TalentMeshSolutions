/**
 * User-facing recruiter destinations.
 *
 * The proxy keeps these aliases stable while the guarded application tree
 * remains role-scoped at /dashboard/recruiter/[role_id]. Keeping the aliases
 * here prevents the shell from scattering recruiter route literals.
 */
export function recruiterHref(path = ''): string {
    const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    return `/recruiter${normalizedPath}`;
}

export const recruiterOverviewHref = recruiterHref('/dashboard');
