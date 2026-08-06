import { Resend } from 'resend';
import { confirmationEmailHtml, welcomeEmailHtml } from './newsletter-templates';

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[TalentMesh Newsletter] RESEND_API_KEY not set — emails will be skipped.');
    return null;
  }

  _resend = new Resend(apiKey);
  return _resend;
}

export interface SendNewsletterResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends the double opt-in confirmation email via Resend.
 */
export async function sendConfirmationEmail(
  to: string,
  confirmUrl: string,
  unsubscribeUrl: string
): Promise<SendNewsletterResult> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: 'Resend not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'insights@talentmeshsolutions.com';
  const html = confirmationEmailHtml(confirmUrl, unsubscribeUrl);

  try {
    const response = await client.emails.send({
      from: `TalentMesh Insights <${fromEmail}>`,
      to,
      subject: 'Confirm your subscription',
      html,
    });

    if (response.error) {
      console.error('[TalentMesh Newsletter] Resend error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`[TalentMesh Newsletter] Sent confirmation email to ${to} (id: ${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err: any) {
    console.error(`[TalentMesh Newsletter] Exception sending confirmation email to ${to}:`, err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Sends the post-confirmation welcome email via Resend.
 */
export async function sendWelcomeEmail(
  to: string,
  unsubscribeUrl: string
): Promise<SendNewsletterResult> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: 'Resend not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'insights@talentmeshsolutions.com';
  const html = welcomeEmailHtml(unsubscribeUrl);

  try {
    const response = await client.emails.send({
      from: `TalentMesh Insights <${fromEmail}>`,
      to,
      subject: 'Welcome to TalentMesh Insights',
      html,
    });

    if (response.error) {
      console.error('[TalentMesh Newsletter] Resend error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`[TalentMesh Newsletter] Sent welcome email to ${to} (id: ${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err: any) {
    console.error(`[TalentMesh Newsletter] Exception sending welcome email to ${to}:`, err);
    return { success: false, error: err.message || String(err) };
  }
}
