import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { sendEmail, customProposalEmail } from '@/lib/email';

const proposalSchema = z.object({
  recruiterId: z.string().uuid().optional(),
  email: z.string().email(),
  name: z.string().default(''),
  company: z.string().default(''),
  features: z.array(z.string()),
  price: z.number().nonnegative(),
});

export const POST = withApi(
  // Sends a priced proposal on the platform's behalf — a billing write, so super_admin only.
  { schema: { body: proposalSchema }, allowedRoles: ['admin', 'super_admin'], requiredPermission: { resource: 'billing', action: 'edit' }, auditLog: true },
  async (_req, { body }) => {
    const { recruiterId, email, name, company, features, price } = body;

    // 1. Insert into custom_proposals
    const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const serviceKey = process.env.INSFORGE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }

    const insforge = createClient({
      baseUrl: supabaseUrl,
      anonKey: serviceKey,
      isServerMode: true
    });

    const { error: insertError } = await insforge.database
      .from('custom_proposals')
      .insert({
        recruiter_id: recruiterId,
        features: features,
        price: price
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save proposal: ' + insertError.message }, { status: 500 });
    }

    // 2. Send email via centralized email service
    const htmlContent = customProposalEmail(name, company, features, String(price));

    const result = await sendEmail({
      to: email,
      subject: `TalentMesh Custom Proposal for ${company}`,
      html: htmlContent,
      role: 'billing',
    });

    if (!result.success) {
      return NextResponse.json({
        success: true,
        warning: `Proposal saved but email was not sent: ${result.error}`
      });
    }

    return NextResponse.json({ success: true });
  }
);
