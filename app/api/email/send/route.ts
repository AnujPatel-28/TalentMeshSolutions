import { NextResponse } from 'next/server';
import {
  sendEmail,
  candidateWelcomeEmail,
  recruiterWelcomeEmail,
  applicationConfirmationEmail,
  applicationStatusEmail,
  interviewScheduledEmail,
  recruiterNewApplicationEmail,
  securityAlertEmail,
} from '@/lib/email';
import type { EmailRole } from '@/lib/email';

/**
 * POST /api/email/send
 *
 * Server-side email sending endpoint.
 * Requires service key authentication via `x-service-key` header.
 *
 * Body:
 * {
 *   to: string;
 *   template: string;          // template name
 *   data: Record<string, any>; // template-specific data
 *   role?: EmailRole;          // optional sender role suffix
 * }
 *
 * OR for custom/raw emails:
 * {
 *   to: string;
 *   subject: string;
 *   html: string;
 *   role?: EmailRole;
 * }
 */
export async function POST(req: Request) {
  try {
    // Auth: require service key for server-to-server calls
    const serviceKey = req.headers.get('x-service-key');
    const expectedKey = process.env.INSFORGE_SERVICE_KEY;

    if (!serviceKey || serviceKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, template, data, subject, html, role } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing "to" field' }, { status: 400 });
    }

    // ── Raw email mode ─────────────────────────────────────────────────────
    if (subject && html) {
      const result = await sendEmail({ to, subject, html, role });
      return NextResponse.json(result);
    }

    // ── Template mode ──────────────────────────────────────────────────────
    if (!template || !data) {
      return NextResponse.json(
        { error: 'Provide either (subject + html) or (template + data)' },
        { status: 400 }
      );
    }

    const emailConfig = resolveTemplate(template, data, role);
    if (!emailConfig) {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
    }

    const result = await sendEmail(emailConfig);
    return NextResponse.json({ ...result, to });
  } catch (err: any) {
    console.error('[Email API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ── Template Resolver ──────────────────────────────────────────────────────

function resolveTemplate(
  template: string,
  data: Record<string, any>,
  role?: EmailRole
): { to: string; subject: string; html: string; role?: EmailRole } | null {
  const { name, email, jobTitle, company, status, date, time, meetingLink, action, ip, candidateName, recruiterName } = data;

  switch (template) {
    case 'candidate-welcome':
      return {
        to: email,
        subject: 'Welcome to TalentMesh! 🎉',
        html: candidateWelcomeEmail(name),
        role: role || 'hr',
      };

    case 'recruiter-welcome':
      return {
        to: email,
        subject: 'Your TalentMesh Recruiter Account is Ready! 🏢',
        html: recruiterWelcomeEmail(name, company),
        role: role || 'hr',
      };

    case 'application-confirmation':
      return {
        to: email,
        subject: `Application Submitted: ${jobTitle}`,
        html: applicationConfirmationEmail(name, jobTitle),
        role: role || 'hr',
      };

    case 'application-status':
      return {
        to: email,
        subject: `Application Update: ${jobTitle}`,
        html: applicationStatusEmail(name, jobTitle, status),
        role: role || 'hr',
      };

    case 'interview-scheduled':
      return {
        to: email,
        subject: `Interview Scheduled: ${jobTitle}`,
        html: interviewScheduledEmail(name, jobTitle, date, time, meetingLink),
        role: role || 'recruiting',
      };

    case 'recruiter-new-application':
      return {
        to: email,
        subject: `New Application: ${candidateName} applied for ${jobTitle}`,
        html: recruiterNewApplicationEmail(recruiterName, candidateName, jobTitle),
        role: role || 'recruiting',
      };

    case 'security-alert':
      return {
        to: email,
        subject: `Security Alert: ${action}`,
        html: securityAlertEmail(name, action, ip),
        role: role || 'security',
      };

    default:
      return null;
  }
}
