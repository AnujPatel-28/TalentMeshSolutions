import {
  Monitor,
  HeartPulse,
  Factory,
  ShoppingBag,
  Truck,
  Landmark,
  Headphones,
  GraduationCap,
  Hotel,
  Rocket,
} from 'lucide-react';
import { ABOUT_INDUSTRIES } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

const ICONS = {
  monitor: Monitor,
  heartPulse: HeartPulse,
  factory: Factory,
  shoppingBag: ShoppingBag,
  truck: Truck,
  landmark: Landmark,
  headphones: Headphones,
  graduationCap: GraduationCap,
  hotel: Hotel,
  rocket: Rocket,
} as const;

/**
 * The ten industry groups as one ruled grid. Owns its own entrance animation,
 * so it is not wrapped again in app/about/page.tsx.
 */
export default function AboutIndustries() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll className={styles.head} animation="fadeUp" once>
        <h2 className={styles.h2}>
          {ABOUT_INDUSTRIES.headingA}{' '}
          <span className={styles.accent}>{ABOUT_INDUSTRIES.headingAccent}</span>
        </h2>
        <p className={styles.lede}>{ABOUT_INDUSTRIES.lede}</p>
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp" delay={90} once>
        <ul className={styles.industryGrid} aria-label="Industries supported">
          {ABOUT_INDUSTRIES.industries.map((industry) => {
            const Icon = ICONS[industry.icon];
            return (
              <li key={industry.name} className={styles.industry}>
                <span className={styles.industryIcon} aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span className={styles.industryName}>{industry.name}</span>
              </li>
            );
          })}
        </ul>
      </AnimateOnScroll>
    </div>
  );
}
