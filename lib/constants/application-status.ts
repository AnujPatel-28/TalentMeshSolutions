export const APPLICATION_STATUSES = [
  "applied",
  "reviewing",
  "shortlisted",
  "interviewing",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
