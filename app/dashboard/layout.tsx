import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerUser } from '@/lib/server-auth';
import LayoutSwitcher from './LayoutSwitcher';
import Unauthorized403 from '@/components/shared/Unauthorized403';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  // Authorization guards (moved from proxy — this is the authoritative enforcement layer)
  // 1. Suspension check — is_active=false means the account has been suspended
  if (user.is_active === false) {
    redirect(`/login?reason=suspended&rd=${depth + 1}`);
  }

  // 2. Onboarding gate — redirect to onboarding if not completed
  if (!user.completed_onboarding) {
    const headersList2 = await headers();
    const currentPathname = headersList2.get('x-pathname') || '';
    if (!currentPathname.startsWith('/onboarding')) {
      if (user.role === 'candidate') {
        redirect('/onboarding/candidate');
      } else if (user.role === 'recruiter') {
        redirect('/onboarding/recruiter/setup');
      }
    }
  }

  // 3. MFA gate — redirect to MFA verification if MFA is enabled but not verified
  if (user.mfa_enabled) {
    const { cookies: getCookies } = await import('next/headers');
    const cookieStore = await getCookies();
    const mfaVerifiedCookie = cookieStore.get('mfa_verified')?.value;
    if (!mfaVerifiedCookie) {
      const headersList2 = await headers();
      const currentPathname = headersList2.get('x-pathname') || '';
      if (!currentPathname.startsWith('/auth/mfa-verify')) {
        redirect('/auth/mfa-verify');
      }
    }
  }

  return <LayoutSwitcher>{children}</LayoutSwitcher>;
}
