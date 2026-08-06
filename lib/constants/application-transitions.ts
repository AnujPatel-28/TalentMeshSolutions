import { ApplicationStatus } from './application-status';

export const VALID_APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  applied: [
    "reviewing",
    "rejected",
    "withdrawn"
  ],
  reviewing: [
    "shortlisted",
    "applied",
    "rejected",
    "withdrawn"
  ],
  shortlisted: [
    "interviewing",
    "reviewing",
    "rejected",
    "withdrawn"
  ],
  interviewing: [
    "offered",
    "shortlisted",
    "rejected"
  ],
  offered: [
    "hired",
    "rejected"
  ],
  hired: [],
  rejected: [
    "reviewing"
  ],
  withdrawn: []
} as const;
