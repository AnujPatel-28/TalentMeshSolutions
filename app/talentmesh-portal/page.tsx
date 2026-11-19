import type { Metadata } from 'next';
import { Hero, Features, HowItWorks, Testimonials, Stats, CTA, Industries, JobListings, UserSegments, SuperhumanPowers, FeaturedJobs, FAQ } from '@/components/sections';
import AnimateOnScroll from '@/components/AnimateOnScroll';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | Talentmesh Solutions".
    title: 'Talentmesh Portal',
    description: 'Explore job listings, employer tools, and everything you need to hire or get hired on the Talentmesh platform.',
    alternates: { canonical: '/talentmesh-portal' },
    openGraph: {
        title: 'Talentmesh Portal | Talentmesh Solutions',
        description: 'Explore job listings, employer tools, and everything you need to hire or get hired on the Talentmesh platform.',
        url: `${SITE_URL}/talentmesh-portal`,
        siteName: 'Talentmesh Solutions',
        type: 'website',
    },
};

export default function TalentMeshPortal() {
  return (
    <div>
      <Hero />
      <AnimateOnScroll animation="fadeUp">
        <UserSegments />
      </AnimateOnScroll>
      <AnimateOnScroll >
        <SuperhumanPowers />
      </AnimateOnScroll>
      <Stats />
      <AnimateOnScroll animation="fadeUp">
        <Industries />
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp" delay={100}>
        <JobListings />
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp">
        <HowItWorks />
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp" delay={100}>
        <Features />
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp">
        <Testimonials />
      </AnimateOnScroll>
      <AnimateOnScroll animation="scaleUp">
        <CTA />
      </AnimateOnScroll>
    </div>
  );
}
