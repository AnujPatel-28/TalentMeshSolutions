import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | Talentmesh Solutions".
  title: 'For Job Seekers',
  description: 'Create your professional portfolio once and connect with actively hiring companies instantly.',
  alternates: { canonical: '/job-seekers' },
  openGraph: {
    title: 'For Job Seekers | Talentmesh Solutions',
    description: 'Create your professional portfolio once and connect with actively hiring companies instantly.',
    url: `${SITE_URL}/job-seekers`,
    siteName: 'Talentmesh Solutions',
    type: 'website',
  },
};

export default function JobSeekersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
