// TalentMesh Solutions — Email Module
// Re-exports for clean imports: import { sendEmail, candidateWelcomeEmail } from '@/lib/email';

export { sendEmail, isEmailConfigured } from './email-service';
export type { SendEmailOptions, SendEmailResult, EmailRole } from './email-service';

export {
  candidateWelcomeEmail,
  recruiterWelcomeEmail,
  applicationConfirmationEmail,
  applicationStatusEmail,
  interviewScheduledEmail,
  recruiterNewApplicationEmail,
  passwordResetEmail,
  securityAlertEmail,
  customProposalEmail,
} from './email-templates';
