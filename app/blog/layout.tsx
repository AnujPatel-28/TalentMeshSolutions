import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Journal: Work, Skills & Technology',
  description: 'Practical perspectives from Talentmesh on hiring, skills, technology, and better ways to work.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Talentmesh Journal', description: 'Practical perspectives on hiring, skills, technology, and better ways to work.', url: '/blog', type: 'website' },
};
export default function BlogLayout({ children }: { children: React.ReactNode }) { return children; }
