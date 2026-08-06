import { Hero, Features, HowItWorks, Testimonials, Stats, CTA, Industries, JobListings, UserSegments, SuperhumanPowers, FeaturedJobs, FAQ } from '@/components/sections';
import AnimateOnScroll from '@/components/AnimateOnScroll';

export default function Home() {
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

