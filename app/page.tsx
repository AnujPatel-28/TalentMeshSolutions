import type { Metadata } from 'next';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import {
  HomeSmoothScroll,
  HomeIntro,
  HomeHero,
  TrustStrip,
  Services,
  IndustriesGrid,
  WhyUs,
  HomeFAQ,
  ContactCTA,
} from '@/components/home';
import { FAQS } from '@/content/home';
import homeStyles from '@/components/home/home.module.css';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Brand spelled out here on purpose: Next's `title.template` in the root
  // layout does not apply to the segment it is defined in, and app/page.tsx
  // shares that segment — so this string renders verbatim.
  title: 'Recruitment & Staffing Agency in Ahmedabad | TalentMesh Solutions',
  description:
    'TalentMesh Solutions is a recruitment and staffing firm in Ahmedabad offering permanent, contract, executive search, RPO and bulk hiring across India.',
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
      'End-to-end manpower services: permanent and contract staffing, executive search, RPO, campus and bulk hiring across ten industries.',
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
      
      <div className={homeStyles.homeScope}>
        <HomeSmoothScroll />
        <HomeIntro />
        <HomeHero />

        {/* Full-bleed: no GridWrapper frame here, so section backgrounds run edge
            to edge. Each section centres its own copy (`.inner`, 1200px).
            overflow-x-clip contains horizontal bleed from the entrance animations.
            `relative z-10` puts it above the hero, which pins while this slides
            up over it. */}
        <div className="relative z-10 w-full overflow-x-clip bg-white">
          {/* Not wrapped: Services pins itself and scrolls its cards sideways. */}
          <Services />

          {/* Ahead of WhyUs, whose last card is about industries: the list
              reads as groundwork there rather than as a repeat after it. */}
          <IndustriesGrid />

          <AnimateOnScroll animation="fadeUp" once>
            <TrustStrip />
          </AnimateOnScroll>

          {/* Not wrapped: WhyUs drives its own scroll sequence. */}
          <WhyUs />

          {/* Parked, not deleted. To bring it back: uncomment and restore the
              import above. */}
          {/* <Process /> */}

          <AnimateOnScroll animation="fadeUp" once>
            <HomeFAQ />
          </AnimateOnScroll>

          <AnimateOnScroll animation="fadeUp" once>
            <ContactCTA />
          </AnimateOnScroll>
        </div>
      </div>
    </>
  );
}
