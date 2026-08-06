// Query-input hardening (R-2): D-13 filter injection, D-17 unbounded limits.

// User input interpolated into PostgREST `.or()` filter strings can smuggle extra
// clauses via `,` `(` `)` `.` `"`. Strip them before interpolation.
export function escapeOrFilter(term: string): string {
  return term.replace(/[,()."]/g, '');
}

// Parse a raw ?limit= value and cap it. Non-numeric / non-positive input gets the default.
export function capLimit(raw: string | null | undefined, max = 100, fallback = 25): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return Math.min(fallback, max);
  return Math.min(n, max);
}
