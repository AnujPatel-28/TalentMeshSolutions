import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: the parent app/employers/layout.tsx defines its own title.template
  // ("%s | Talentmesh for Employers"), which takes precedence over the root's.
  title: 'Post a Job',
  description: 'Create job listings, attract qualified candidates, manage applications, and streamline your hiring process with Talentmesh.',
  alternates: { canonical: '/employers/post-job' },
  openGraph: {
    title: 'Post a Job | Talentmesh for Employers',
    description: 'Create job listings, attract qualified candidates, manage applications, and streamline your hiring process with Talentmesh.',
    url: `${SITE_URL}/employers/post-job`,
    siteName: 'Talentmesh Solutions',
    type: 'website',
  },
};

export default function PostJobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
