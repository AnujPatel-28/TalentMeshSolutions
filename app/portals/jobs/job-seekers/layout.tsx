import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | TalentMesh Solutions".
  title: 'For Job Seekers',
  description: 'Create your professional portfolio once and connect with actively hiring companies instantly.',
  alternates: { canonical: '/job-seekers' },
  openGraph: {
    title: 'For Job Seekers | TalentMesh Solutions',
    description: 'Create your professional portfolio once and connect with actively hiring companies instantly.',
    url: `${SITE_URL}/job-seekers`,
    siteName: 'TalentMesh Solutions',
    type: 'website',
  },
};

export default function JobSeekersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
