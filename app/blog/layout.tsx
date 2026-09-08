import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | TalentMesh Solutions".
  title: 'Blog',
  description: 'Insights, hiring advice, and career growth resources from TalentMesh Solutions.',
  alternates: { canonical: '/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
