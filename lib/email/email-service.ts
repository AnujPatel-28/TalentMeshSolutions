import nodemailer from 'nodemailer';

// ── Types ────────────────────────────────────────────────────────────────────

export type EmailRole = 'hr' | 'security' | 'recruiting' | 'billing' | 'system' | 'admin';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Role-based suffix appended to sender name, e.g. "TalentMesh Solutions - HR" */
  role?: EmailRole;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── Role Display Names ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<EmailRole, string> = {
  hr: 'HR',
  security: 'Security',
  recruiting: 'Recruiting',
  billing: 'Billing',
  system: 'System',
  admin: 'Admin',
};

// ── Transporter (singleton) ──────────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      '[TalentMesh Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — emails will be skipped.'
    );
    return null;
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return _transporter;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an email through Gmail SMTP.
 *
 * - Gracefully returns `{ success: false }` when credentials are missing.
 * - Sender name follows the pattern: "TalentMesh Solutions - HR" etc.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, role } = options;

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: 'Email credentials not configured — email was not sent.',
    };
  }

  const user = process.env.GMAIL_USER!;
  const baseName = process.env.GMAIL_FROM_NAME || 'TalentMesh Solutions';
  const fromName = role ? `${baseName} - ${ROLE_LABELS[role]}` : baseName;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    console.log(`[TalentMesh Email] Sent "${subject}" to ${to} — msgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[TalentMesh Email] Failed to send "${subject}" to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if the email service is configured and ready.
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}
