import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerUser } from '@/lib/server-auth';
import Unauthorized403 from '@/components/shared/Unauthorized403';

export default async function CandidateDashboardLayout({ children }: { children: React.ReactNode }) {
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

  // Role guard — non-candidates should not access candidate dashboard
  if (user.role !== 'candidate') {
    if (user.role === 'admin' || user.role === 'super_admin') {
      redirect(`/admin/dashboard?rd=${depth + 1}`);
    } else {
      redirect(`/recruiter/dashboard?rd=${depth + 1}`);
    }
  }

  return <>{children}</>;
}
