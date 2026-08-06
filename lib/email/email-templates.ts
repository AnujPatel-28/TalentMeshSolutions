/**
 * TalentMesh Solutions — Branded Email Templates
 *
 * Every template returns an HTML string. The shared `layout()` wrapper provides
 * consistent branding (header, footer, responsive design) across all emails.
 */

// ── Shared Layout ────────────────────────────────────────────────────────────

const BRAND_COLOR = '#2563eb';
const BRAND_GRADIENT = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#x27;';
      default: return m;
    }
  });
}

function layout(body: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TalentMesh Solutions</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_GRADIENT};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                TalentMesh
              </h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:1px;text-transform:uppercase;">
                Solutions
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} TalentMesh Solutions. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                <a href="${SITE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">Visit TalentMesh</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/dashboard" style="color:${BRAND_COLOR};text-decoration:none;">Dashboard</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">
                This is an automated message from TalentMesh Solutions. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Reusable CTA button */
function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto;">
      <tr>
        <td style="background:${BRAND_GRADIENT};border-radius:8px;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

/** Section divider */
function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

/** Info box */
function infoBox(content: string): string {
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
      ${content}
    </div>`;
}

// ── Email Templates ──────────────────────────────────────────────────────────

// ─── Candidate Welcome ───────────────────────────────────────────────────────

export function candidateWelcomeEmail(name: string): string {
  const safeName = escapeHtml(name);
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Welcome to TalentMesh, ${safeName}! 🎉</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      We're thrilled to have you on board. TalentMesh connects talented professionals
      like you with opportunities that truly match your skills and aspirations.
    </p>
    ${infoBox(`
      <h3 style="margin:0 0 12px;font-size:16px;color:#0f172a;">🚀 What's next?</h3>
      <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;">
        <li>Complete your profile to get matched with top jobs</li>
        <li>Upload your resume for AI-powered skill analysis</li>
        <li>Browse curated job recommendations</li>
        <li>Apply with one click and track your applications</li>
      </ul>
    `)}
    ${ctaButton('Complete Your Profile', `${SITE_URL}/dashboard/candidate`)}
    <p style="margin:0;font-size:14px;color:#64748b;text-align:center;">
      The more complete your profile, the better your job matches will be.
    </p>
  `, `Welcome to TalentMesh, ${safeName}! Start exploring opportunities today.`);
}

// ─── Recruiter Welcome ───────────────────────────────────────────────────────

export function recruiterWelcomeEmail(name: string, company?: string): string {
  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(company || '');
  const greeting = safeCompany ? `${safeName} from ${safeCompany}` : safeName;
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Welcome to TalentMesh, ${greeting}! 🏢</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Your recruiter account has been approved and activated. You now have access to our
      full hiring platform powered by AI matching.
    </p>
    ${infoBox(`
      <h3 style="margin:0 0 12px;font-size:16px;color:#0f172a;">🎯 Get started:</h3>
      <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;">
        <li>Set up your company profile</li>
        <li>Post your first job listing</li>
        <li>Get AI-matched candidates instantly</li>
        <li>Schedule interviews right from the dashboard</li>
      </ul>
    `)}
    ${ctaButton('Go to Recruiter Dashboard', `${SITE_URL}/dashboard/recruiter`)}
  `, `Your TalentMesh recruiter account is ready. Start hiring top talent today!`);
}

// ─── Application Confirmation ────────────────────────────────────────────────

export function applicationConfirmationEmail(name: string, jobTitle: string): string {
  const safeName = escapeHtml(name);
  const safeJobTitle = escapeHtml(jobTitle);
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Application Submitted! ✅</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${safeName}, your application for <strong>${safeJobTitle}</strong> has been received successfully.
    </p>
    ${infoBox(`
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
        <strong>Position:</strong> ${safeJobTitle}<br/>
        <strong>Status:</strong> <span style="color:${BRAND_COLOR};font-weight:600;">Under Review</span><br/>
        <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      The hiring team will review your profile and get back to you. You'll receive an
      email notification when your application status changes.
    </p>
    ${ctaButton('Track Your Applications', `${SITE_URL}/dashboard/candidate`)}
  `, `Your application for ${safeJobTitle} has been submitted successfully.`);
}

// ─── Application Status Update ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { emoji: string; color: string; label: string; message: string }> = {
  shortlisted: {
    emoji: '⭐',
    color: '#16a34a',
    label: 'Shortlisted',
    message: 'Great news! You\'ve been shortlisted for this position. The recruiter is interested in your profile.',
  },
  interview: {
    emoji: '📅',
    color: '#2563eb',
    label: 'Interview Stage',
    message: 'You\'ve moved to the interview stage. Keep an eye out for interview scheduling details.',
  },
  offered: {
    emoji: '🎉',
    color: '#7c3aed',
    label: 'Offer Extended',
    message: 'Congratulations! An offer has been extended for this position. Please check your dashboard for details.',
  },
  rejected: {
    emoji: '📋',
    color: '#dc2626',
    label: 'Not Selected',
    message: 'Unfortunately, the hiring team has decided to move forward with other candidates. Don\'t be discouraged — new opportunities are always available!',
  },
  withdrawn: {
    emoji: '↩️',
    color: '#64748b',
    label: 'Withdrawn',
    message: 'Your application has been withdrawn as requested.',
  },
};

export function applicationStatusEmail(name: string, jobTitle: string, status: string): string {
  const safeName = escapeHtml(name);
  const safeJobTitle = escapeHtml(jobTitle);
  const safeStatus = escapeHtml(status);
  const config = STATUS_CONFIG[status] || {
    emoji: '📋',
    color: BRAND_COLOR,
    label: safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1),
    message: `Your application status has been updated to "${safeStatus}".`,
  };

  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Application Update ${config.emoji}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${safeName}, there's an update on your application:
    </p>
    ${infoBox(`
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
        <strong>Position:</strong> ${safeJobTitle}<br/>
        <strong>New Status:</strong> <span style="color:${config.color};font-weight:700;">${config.label}</span>
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      ${config.message}
    </p>
    ${ctaButton('View Application', `${SITE_URL}/dashboard/candidate`)}
  `, `Application update: Your application for ${safeJobTitle} is now ${config.label}.`);
}

// ─── Interview Scheduled ─────────────────────────────────────────────────────

export function interviewScheduledEmail(
  name: string,
  jobTitle: string,
  date: string,
  time: string,
  meetingLink?: string
): string {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Interview Scheduled! 📅</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${name}, your interview for <strong>${jobTitle}</strong> has been confirmed.
    </p>
    ${infoBox(`
      <h3 style="margin:0 0 12px;font-size:16px;color:#0f172a;">📋 Interview Details</h3>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.8;">
        <strong>Position:</strong> ${jobTitle}<br/>
        <strong>Date:</strong> ${date}<br/>
        <strong>Time:</strong> ${time}<br/>
        ${meetingLink ? `<strong>Meeting Link:</strong> <a href="${meetingLink}" style="color:${BRAND_COLOR};">${meetingLink}</a>` : ''}
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Please be ready 5 minutes early. Make sure your camera and microphone are working if it's a video interview.
    </p>
    ${meetingLink ? ctaButton('Join Interview', meetingLink) : ctaButton('View Details', `${SITE_URL}/dashboard/candidate`)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      💡 <strong>Tips:</strong> Research the company, prepare examples of your work, and have questions ready for the interviewer.
    </p>
  `, `Your interview for ${jobTitle} is confirmed for ${date} at ${time}.`);
}

// ─── Recruiter: New Application Alert ────────────────────────────────────────

export function recruiterNewApplicationEmail(
  recruiterName: string,
  candidateName: string,
  jobTitle: string
): string {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">New Application Received 📩</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${recruiterName}, a new candidate has applied to your job posting.
    </p>
    ${infoBox(`
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
        <strong>Candidate:</strong> ${candidateName}<br/>
        <strong>Position:</strong> ${jobTitle}<br/>
        <strong>Applied:</strong> ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Review their profile and AI match score on your dashboard to decide next steps.
    </p>
    ${ctaButton('Review Application', `${SITE_URL}/dashboard/recruiter`)}
  `, `${candidateName} has applied to ${jobTitle}. Review their profile now.`);
}

// ─── Password Reset ──────────────────────────────────────────────────────────

export function passwordResetEmail(name: string, resetLink: string): string {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Password Reset Request 🔐</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${name}, we received a request to reset your TalentMesh password.
    </p>
    ${ctaButton('Reset My Password', resetLink)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      ⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email — your account is safe.
    </p>
  `, `Password reset requested for your TalentMesh account.`);
}

// ─── Security Alert ──────────────────────────────────────────────────────────

export function securityAlertEmail(name: string, action: string, ip?: string): string {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Security Alert 🛡️</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${name}, we detected a security-related activity on your account.
    </p>
    ${infoBox(`
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
        <strong>Activity:</strong> ${action}<br/>
        <strong>Date:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}<br/>
        ${ip ? `<strong>IP Address:</strong> ${ip}` : ''}
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      If this was you, no action is needed. If you don't recognise this activity,
      please secure your account immediately.
    </p>
    ${ctaButton('Review Account Security', `${SITE_URL}/dashboard`)}
  `, `Security alert: ${action} detected on your TalentMesh account.`);
}

// ─── Custom Proposal (for admin send-proposal refactor) ──────────────────────

export function customProposalEmail(
  name: string,
  company: string,
  features: string[],
  price: string
): string {
  const featuresHtml = features.map((f) => `<li style="padding:4px 0;">✔️ ${f}</li>`).join('');

  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Custom Partnership Proposal</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${name || company}, thank you for your interest in TalentMesh.
      Based on our review, we've put together a custom platform access plan specifically
      for <strong>${company}</strong>.
    </p>
    ${infoBox(`
      <h3 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Included Features:</h3>
      <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.6;">
        ${featuresHtml || '<li>Full Platform Access</li>'}
      </ul>
      ${divider()}
      <h3 style="margin:0 0 4px;font-size:16px;color:#0f172a;">Special Pricing:</h3>
      <p style="font-size:28px;font-weight:700;color:${BRAND_COLOR};margin:8px 0 0;">
        ₹${price} <span style="font-size:14px;font-weight:400;color:#64748b;">/ year</span>
      </p>
    `)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      If this looks good, reply to this email to confirm and we'll activate your
      account and send an invoice.
    </p>
    ${ctaButton('Learn More About TalentMesh', SITE_URL)}
  `, `Custom proposal for ${company} — ₹${price}/year.`);
}
