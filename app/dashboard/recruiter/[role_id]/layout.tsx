import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerUser } from '@/lib/server-auth';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import RecruiterLayoutClient from './RecruiterLayoutClient';

export default async function RecruiterDashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getServerUser();
    if (!user) {
        const pathname = (await headers()).get('x-pathname') || '';
        redirect(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }

    // Wrong portal. [role_id] in the URL is addressing, not authorization — the role comes
    // from the session only.
    if (user.role !== 'recruiter') {
        if (user.role === 'admin' || user.role === 'super_admin') {
            redirect('/admin/dashboard');
        }
        redirect(`/dashboard/candidate/${user.id}`);
    }

    // Resolve membership + company status on the caller's own token: company_members_read_self
    // (052) exposes the caller's own row at any status; companies_public_read (046) exposes the
    // company. Ownership is always the session user id — never a param.
    const db = await getServerInsforgeClient();
    if (!db) redirect('/login');

    const { data: member } = await db.database
        .from('company_members')
        .select('company_id, member_role, status')
        .eq('user_id', user.id)
        .neq('status', 'removed')
        .maybeSingle();

    // No membership (or removed) — start/redo the access request.
    if (!member) redirect('/onboarding/recruiter/setup');

    // invited / suspended
    if (member.status !== 'active') redirect('/pending-approval');

    const { data: company } = await db.database
        .from('companies')
        .select('status')
        .eq('id', member.company_id)
        .maybeSingle();

    // Unverified, or unreadable (a deactivated/inactive company falls out of
    // companies_public_read and reads back as null) — fail closed.
    if (company?.status !== 'verified') redirect('/pending-approval');

    return (
        <RecruiterLayoutClient companyId={member.company_id} memberRole={member.member_role}>
            {children}
        </RecruiterLayoutClient>
    );
}
