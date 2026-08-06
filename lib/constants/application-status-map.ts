import { ApplicationStatus } from './application-status';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
} as const;

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: '#007BFF',      // Info Blue
  reviewing: '#007BFF',    // Info Blue
  shortlisted: '#7C3AED', // Purple
  interviewing: '#007BFF', // Info Blue (candidate anxiety reduction)
  offered: '#10B981',   // Success Green
  hired: '#10B981', // Success Green
  rejected: '#EF4444',     // Error Red
  withdrawn: '#6B7280', // Muted gray
} as const;
