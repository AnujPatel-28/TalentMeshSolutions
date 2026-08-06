import { ApplicationStatus } from './application-status';

export const APPLICATION_STATUSES = {
  APPLIED: 'applied',
  REVIEWING: 'reviewing',
  SHORTLISTED: 'shortlisted',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export type { ApplicationStatus };

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  reviewing: 'Under Review',
  shortlisted: 'Shortlisted',
  interviewing: 'Interviewing',
  offered: 'Offer Received',
  hired: 'Hired 🎉',
  rejected: 'Not Selected',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: '#3b82f6',      // Blue
  reviewing: '#f59e0b',    // Amber
  shortlisted: '#10b981',  // Emerald
  interviewing: '#7c3aed', // Purple
  offered: '#10b981',      // Emerald
  hired: '#059669',        // Dark Emerald
  rejected: '#ef4444',     // Red
  withdrawn: '#64748b',    // Slate
};
