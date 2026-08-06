// Canonical jobs.status transition table (doc 04 §4 job lifecycle). admin-jobs (R-5) is the
// only place that currently enforces it server-side — the recruiter routes
// (app/api/jobs/[jobId]/{route,publish,close}.ts) rely on the entitlement trigger only and do
// not validate from/to pairs. Do not duplicate this table elsewhere; import it.
const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [],
};

export function isValidJobStatusTransition(from: string, to: string): boolean {
  if (from === to) return false;
  return JOB_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
