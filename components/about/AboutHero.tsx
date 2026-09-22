import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Users, Building2, Star } from 'lucide-react';
import { ABOUT_HERO } from '@/content/about';
import styles from './about.module.css';

const TRUST_ICONS = {
  users: Users,
  building: Building2,
  star: Star,
} as const;

export default function AboutHero() {
  return (
    <section className={styles.heroCinematic} aria-label="About TalentMesh Solutions">
      <div className={styles.heroCinematicMedia}>
        <Image
          src={ABOUT_HERO.imageSrc}
          alt={ABOUT_HERO.imageAlt}
          fill
          priority
          sizes="100vw"
          className={styles.heroCinematicBg}
        />
      </div>
      <div className={styles.heroCinematicScrim} aria-hidden="true" />
      <div className={styles.heroCinematicInner}>
        <div className={styles.heroCinematicCopy}>
          <p className={styles.heroCinematicEyebrow}>{ABOUT_HERO.eyebrow}</p>
          <h1 className={styles.heroCinematicTitle}>
            <span className={styles.heroCinematicTitleLight}>{ABOUT_HERO.titleLight}</span>{' '}
            {ABOUT_HERO.titleWhite}{' '}
            <span className={styles.heroCinematicTitleAccent}>{ABOUT_HERO.titleAccent}</span>
          </h1>
          <p className={styles.heroCinematicSub}>{ABOUT_HERO.description}</p>
          <div className={styles.heroCinematicActions}>
            <Link href={ABOUT_HERO.primaryCta.href} className={styles.btnPrimaryBlue}>
              {ABOUT_HERO.primaryCta.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href={ABOUT_HERO.secondaryCta.href} className={styles.btnOutlineLight}>
              {ABOUT_HERO.secondaryCta.label}
            </Link>
          </div>
          <ul className={styles.heroCinematicTrust} aria-label="Why TalentMesh">
            {ABOUT_HERO.trust.map((item) => {
              const Icon = TRUST_ICONS[item.icon as keyof typeof TRUST_ICONS] ?? Users;
              return (
                <li key={item.title}>
                  <Icon size={20} aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className={styles.heroCinematicStrip} aria-hidden="true">
        <span>{ABOUT_HERO.stripLeft}</span>
        <span>{ABOUT_HERO.stripRight}</span>
      </div>
    </section>
  );
}
