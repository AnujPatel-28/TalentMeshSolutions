import type { Metadata } from 'next';
import { Michroma } from 'next/font/google';
import { CONTACT_FAQS } from './faqs';

const SITE_URL = 'https://talentmeshsolutions.com';

// Wide, squared lettering close to the Talentmesh wordmark; used only for this page's heading.
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma', display: 'swap' });

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

// Describes only this page's four questions; the home page emits its own FAQPage.
const contactFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/contact#faq`,
  mainEntity: CONTACT_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactFaqJsonLd) }}
      />
      <div className={michroma.variable} style={{ display: 'contents' }}>{children}</div>
    </>
  );
}
