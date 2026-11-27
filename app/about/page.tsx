import type { Metadata } from 'next';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import {
  AboutHero,
  WhoWeAre,
  Principles,
  AboutServices,
  AboutProcess,
  // AboutIndustries, // hidden for now; see the Industries section below
  AboutCTA,
} from '@/components/about';
import styles from '@/components/about/about.module.css';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
  // Bare title on purpose: the root layout's title.template ("%s | Talentmesh
  // Solutions") applies to this segment and appends the suffix automatically.
  title: 'About Us',
  description:
    'Talentmesh Solutions is an Ahmedabad-based recruitment and staffing solutions provider offering end-to-end talent acquisition, staffing, hiring coordination, and workforce support services across multiple industries.',
  keywords: [
    'about Talentmesh Solutions',
    'recruitment agency Ahmedabad',
    'staffing company India',
    'hiring partner India',
    'workforce solutions India',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Talentmesh Solutions | Recruitment & Staffing Partner in India',
    description:
      'A trusted recruitment and workforce solutions partner helping organizations find skilled talent and build high-performing teams.',
    url: `${SITE_URL}/about`,
    siteName: 'Talentmesh Solutions',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/images/about/about-hero-editorial.png`,
        alt: 'Two Talentmesh consultants reviewing candidate profiles across a table at dusk',
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
  name: 'About Talentmesh Solutions',
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

      <div className={styles.aboutScope}>
        <AboutHero />

        {/* Full-bleed sections, as on the home page: no GridWrapper frame.
            Each section centres its own copy (`.inner`). Sections that stage
            their own entrance (heading, then items) are not wrapped again. */}
        <div className={styles.page}>
          <section className={styles.section} aria-labelledby="about-who">
            <WhoWeAre />
          </section>

          <section className={styles.section} aria-label="What we stand for">
            <Principles />
          </section>

          <section className={styles.section} aria-label="What we do">
            <AboutServices />
          </section>

          <section className={`${styles.section} ${styles.sectionTint}`} aria-label="How we work">
            <AboutProcess />
          </section>

          {/* Industries is hidden for now: the home page already covers it.
              The team will decide whether to keep it. To bring it back,
              uncomment this section and the AboutIndustries import above.
          <section className={styles.section} aria-label="Industries we support">
            <AboutIndustries />
          </section>
          */}

          <section className={`${styles.section} ${styles.sectionCta}`} aria-label="Contact">
            <AnimateOnScroll animation="fadeUp" once>
              <AboutCTA />
            </AnimateOnScroll>
          </section>
        </div>
      </div>
    </>
  );
}
