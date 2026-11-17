import type { Metadata } from 'next';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title: root layout's title.template appends " | Talentmesh Solutions".
  title: 'Contact Us',
  description: 'Contact Talentmesh Solutions in Ahmedabad for recruitment, staffing and hiring support across India. Speak with our team about your hiring or career needs.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | Talentmesh Solutions',
    description: 'Contact Talentmesh Solutions in Ahmedabad for recruitment, staffing and hiring support across India. Speak with our team about your hiring or career needs.',
    url: `${SITE_URL}/contact`,
    siteName: 'Talentmesh Solutions',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
