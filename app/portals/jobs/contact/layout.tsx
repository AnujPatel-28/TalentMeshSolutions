import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | TalentMesh Solutions".
  title: 'Contact Us',
  description: 'Have questions about our architectural approach or need a custom solution? Our team is ready to assist you.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | TalentMesh Solutions',
    description: 'Have questions about our architectural approach or need a custom solution? Our team is ready to assist you.',
    url: `${SITE_URL}/contact`,
    siteName: 'TalentMesh Solutions',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
