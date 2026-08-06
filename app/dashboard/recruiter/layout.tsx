import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerUser } from '@/lib/server-auth';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { isRecruiterApproved } from '@/lib/recruiter-approval';
import Unauthorized403 from '@/components/shared/Unauthorized403';

export default async function RecruiterDashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const depthStr = headersList.get('x-redirect-depth') || '0';
  const depth = parseInt(depthStr, 10);

  if (depth > 3) {
    return <Unauthorized403 />;
  }

  const user = await getServerUser();
  if (!user) {
    redirect(`/login?rd=${depth + 1}`);
  }

  // Guard recruiter subpages from non-recruiters
  if (user.role !== 'recruiter' && user.role !== 'admin' && user.role !== 'super_admin') {
    redirect(`/dashboard/candidate/${user.id}?rd=${depth + 1}`);
  }

  const urlStr = headersList.get('x-url');
  const pathname = urlStr ? new URL(urlStr).pathname : '';

  // Guard unapproved recruiters from accessing recruiter subpages. Source of truth is
  // company_members.status + companies.status (doc 14 killed the legacy recruiter_profiles
  // pipeline) — a missing row must deny, not skip the check.
  if (user.role === 'recruiter' && !pathname.includes('/pending-approval')) {
    const db = await getServerInsforgeClient();
    if (!db) redirect(`/login?rd=${depth + 1}`);

    const { data: member } = await db.database
      .from('company_members')
      .select('company_id, status')
      .eq('user_id', user.id)
      .neq('status', 'removed')
      .maybeSingle();

    const { data: company } = member
      ? await db.database.from('companies').select('status').eq('id', member.company_id).maybeSingle()
      : { data: null };

    if (!isRecruiterApproved(member, company)) {
      redirect(`/pending-approval?rd=${depth + 1}`);
    }
  }

  return <>{children}</>;
}
