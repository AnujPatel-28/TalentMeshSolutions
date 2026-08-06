/**
 * TalentMesh Solutions — Newsletter Email Templates
 *
 * Isolated newsletter email templates incorporating double opt-in confirmation
 * and welcome messages with a clean branding design and mandatory unsubscribe links.
 */

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function layout(body: string, unsubscribeUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TalentMesh Insights</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
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
                Insights
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;color:#334155;line-height:1.6;font-size:15px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;background-color:#fafafb;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} TalentMesh Solutions. All rights reserved.
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;">
                You're receiving this because you subscribed to TalentMesh Insights.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                <a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">Visit TalentMesh</a>
                ${unsubscribeUrl ? `&nbsp;·&nbsp; <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>` : ''}
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

/**
 * Returns HTML string for the newsletter subscription confirmation email.
 */
export function confirmationEmailHtml(confirmUrl: string, unsubscribeUrl: string): string {
  const body = `
    <p style="margin-top:0;">Thanks for subscribing to TalentMesh Insights!</p>
    <p>Please confirm your email address by clicking the button below so we can start sending you our recruitment updates and career insights.</p>
    ${ctaButton('Confirm Subscription', confirmUrl)}
    <p style="font-size:13px;color:#64748b;margin-top:24px;">
      If the button above doesn't work, copy and paste this URL into your browser:<br />
      <a href="${confirmUrl}" style="color:#2563eb;word-break:break-all;">${confirmUrl}</a>
    </p>
    <p>If you did not request this subscription, you can safely ignore this email.</p>
  `;
  return layout(body, unsubscribeUrl);
}

/**
 * Returns HTML string for the newsletter welcome email.
 */
export function welcomeEmailHtml(unsubscribeUrl: string): string {
  const body = `
    <p style="margin-top:0;font-size:18px;font-weight:700;color:#0f172a;">Welcome to TalentMesh Insights! 🎉</p>
    <p>Thank you for subscribing. Your subscription is now active.</p>
    <p>You'll receive regular monthly updates packed with:</p>
    <ul style="padding-left:20px;margin:16px 0;">
      <li style="margin-bottom:8px;"><strong>Hiring trends</strong> – what the best companies are looking for right now.</li>
      <li style="margin-bottom:8px;"><strong>Recruitment best practices</strong> – optimization techniques for scaling teams.</li>
      <li style="margin-bottom:8px;"><strong>AI in HR</strong> – deep dives into artificial intelligence applications in talent matching.</li>
      <li style="margin-bottom:8px;"><strong>Product announcements</strong> – get first looks at new TalentMesh features.</li>
      <li style="margin-bottom:8px;"><strong>Career insights</strong> – tactical advice from market-leading alumni.</li>
    </ul>
    <p>We're thrilled to have you with us!</p>
    ${ctaButton('Visit TalentMesh', SITE_URL)}
  `;
  return layout(body, unsubscribeUrl);
}
