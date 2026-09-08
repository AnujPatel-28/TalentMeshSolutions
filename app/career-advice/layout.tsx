import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | TalentMesh Solutions".
  title: 'Career Advice',
  description: "Get personalized career guidance, resume reviews, and interview preparation from TalentMesh's recruitment specialists.",
  alternates: { canonical: '/career-advice' },
  openGraph: {
    title: 'Career Advice | TalentMesh Solutions',
    description: "Get personalized career guidance, resume reviews, and interview preparation from TalentMesh's recruitment specialists.",
    url: `${SITE_URL}/career-advice`,
    siteName: 'TalentMesh Solutions',
    type: 'website',
  },
};

export default function CareerAdviceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
