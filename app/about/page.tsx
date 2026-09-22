import type { Metadata } from 'next';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import GridWrapper from '@/components/ui/GridWrapper';
import SectionMarker from '@/components/home/SectionMarker';
import {
  AboutHero,
  VisionStatement,
  Principles,
  AboutServices,
  AboutProcess,
  AboutIndustries,
  AboutCTA,
} from '@/components/about';
import styles from '@/components/about/about.module.css';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title on purpose: the root layout's title.template ("%s | TalentMesh
  // Solutions") applies to this segment and appends the suffix automatically.
  title: 'About Us',
  description:
    'TalentMesh Solutions is an Ahmedabad-based recruitment and staffing solutions provider offering end-to-end talent acquisition, staffing, hiring coordination, and workforce support services across multiple industries.',
  keywords: [
    'about TalentMesh Solutions',
    'recruitment agency Ahmedabad',
    'staffing company India',
    'hiring partner India',
    'workforce solutions India',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About TalentMesh Solutions | Recruitment & Staffing Partner in India',
    description:
      'A trusted recruitment and workforce solutions partner helping organizations find skilled talent and build high-performing teams.',
    url: `${SITE_URL}/about`,
    siteName: 'TalentMesh Solutions',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/images/about/about-hero-editorial.png`,
        alt: 'Two TalentMesh consultants reviewing candidate profiles across a table at dusk',
      },
    ],
  },
};

/**
 * Organization node lives in app/layout.tsx. Only AboutPage is added here
 * to avoid duplicating Organization schema.
 */
const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE_URL}/about#page`,
  url: `${SITE_URL}/about`,
  name: 'About TalentMesh Solutions',
  description:
    'Ahmedabad-based recruitment and staffing solutions provider offering end-to-end talent acquisition and workforce support.',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#org` },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <AboutHero />

      <GridWrapper>
        <section className="relative" aria-label="Vision">
          <SectionMarker label="Our Vision" index={1} />
          {/* No AnimateOnScroll wrapper: the quote runs its own GSAP word
              reveal inside VisionStatement; an outer fade would double-animate. */}
          <VisionStatement />
        </section>

        <section className="relative" aria-label="What we stand for">
          <SectionMarker label="What We Stand For" index={2} />
          <div className={`${styles.section} ${styles.tint} ${styles.principlesGrain}`}>
            {/* No outer AnimateOnScroll: Principles staggers its own heading
                and cards internally — see the same note on VisionStatement
                above. */}
            <Principles />
          </div>
        </section>

        <section className="relative" aria-label="What we do">
          <SectionMarker label="What We Do" index={3} />
          <div className={styles.section}>
            <AnimateOnScroll animation="fadeUp" once>
              <AboutServices />
            </AnimateOnScroll>
          </div>
        </section>

        <section className="relative" aria-label="How we work">
          <SectionMarker label="How We Work" index={4} />
          <div className={styles.section}>
            {/* No outer AnimateOnScroll: AboutProcess staggers its own heading
                and steps internally — see the same note on Principles above. */}
            <AboutProcess />
          </div>
        </section>

        <section className="relative" aria-label="Industries and location">
          <SectionMarker label="Industries & Base" index={5} />
          <div className={styles.section}>
            {/* No outer AnimateOnScroll: AboutIndustries stages its own
                heading/lede, then the pill list and base card — see the
                same note on Principles above. */}
            <AboutIndustries />
          </div>
        </section>

        <section className="relative" aria-label="Contact">
          <SectionMarker label="Get Started" index={6} />
          <div className={styles.section}>
            <AnimateOnScroll animation="fadeUp" once>
              <AboutCTA />
            </AnimateOnScroll>
          </div>
        </section>
      </GridWrapper>
    </>
  );
}
