import type { Metadata } from 'next';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import {
  HomeHero,
  TrustStrip,
  Services,
  IndustriesGrid,
  WhyUs,
  HomeFAQ,
  ContactCTA,
} from '@/components/home';
import { FAQS } from '@/content/home';
import GridWrapper from '@/components/ui/GridWrapper';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Brand spelled out here on purpose: Next's `title.template` in the root
  // layout does not apply to the segment it is defined in, and app/page.tsx
  // shares that segment — so this string renders verbatim.
  title: 'Recruitment & Staffing Agency in Ahmedabad | TalentMesh Solutions',
  description:
    'TalentMesh Solutions is a result-driven recruitment and staffing firm in Ahmedabad offering end-to-end manpower services — permanent and contract staffing, executive search, RPO, campus and bulk hiring across IT, BFSI, Pharma, Manufacturing and more.',
  keywords: [
    'recruitment agency Ahmedabad',
    'staffing company India',
    'manpower consultancy Ahmedabad',
    'permanent staffing India',
    'contract staffing',
    'RPO services India',
    'executive search India',
    'bulk hiring',
    'campus recruitment India',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'TalentMesh Solutions | Recruitment & Staffing Agency in India',
    description:
      'End-to-end manpower services — permanent and contract staffing, executive search, RPO, campus and bulk hiring across ten industries.',
    url: SITE_URL,
    siteName: 'TalentMesh Solutions',
    type: 'website',
    // No `images` key: app/opengraph-image.tsx supplies it via file convention.
  },
};

/**
 * The Organization node lives in app/layout.tsx and is emitted on every page.
 * Only WebSite and FAQPage are added here — duplicating Organization would be a
 * schema error. `publisher` points back at the layout node by @id.
 */
const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'TalentMesh Solutions',
      description:
        'Recruitment and staffing firm in Ahmedabad delivering end-to-end manpower services across India.',
      inLanguage: 'en-IN',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      
      <HomeHero />

      <GridWrapper>
        <AnimateOnScroll animation="fadeUp" once>
          <Services />
        </AnimateOnScroll>

        <TrustStrip />

        {/* Not wrapped: WhyUs staggers its own entrance, like TrustStrip. */}
        <WhyUs />

        <IndustriesGrid />

        {/* Parked, not deleted. To bring it back: uncomment, restore the import
            above, and shift HomeFAQ to index={6} and ContactCTA to index={7} —
            Process owns [05] and pushes the rest of the sequence down. */}
        {/* <Process /> */}

        <AnimateOnScroll animation="fadeUp" once>
          <HomeFAQ />
        </AnimateOnScroll>

        <AnimateOnScroll animation="fadeUp" once>
          <ContactCTA />
        </AnimateOnScroll>
      </GridWrapper>
    </>
  );
}
