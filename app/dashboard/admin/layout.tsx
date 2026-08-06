import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerUser } from '@/lib/server-auth';
import Unauthorized403 from '@/components/shared/Unauthorized403';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
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

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    if (user.role === 'recruiter') {
      redirect(`/dashboard/recruiter/${user.id}?rd=${depth + 1}`);
    } else {
      redirect(`/dashboard/candidate/${user.id}?rd=${depth + 1}`);
    }
  }

  // A suspended admin keeps a valid session but must lose portal access immediately.
  // See 11_Admin_Portal_Audit_And_Remediation (A-2).
  if (user.is_active === false) {
    redirect('/login?reason=suspended');
  }

  return <>{children}</>;
}
