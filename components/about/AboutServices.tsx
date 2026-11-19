import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/content/home';
import { ABOUT_SERVICES, ABOUT_SERVICE_IMAGES } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Three image-led panels, one per service category. List items that have
 * their own solution page link to it (ABOUT_SERVICES.links). Owns its own
 * entrance animation, so it is not wrapped again in app/about/page.tsx.
 */
export default function AboutServices() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll className={styles.head} animation="fadeUp" once>
        <h2 className={styles.h2}>
          {ABOUT_SERVICES.headingA} <span className={styles.accent}>{ABOUT_SERVICES.headingAccent}</span>
        </h2>
        <p className={styles.lede}>{ABOUT_SERVICES.lede}</p>
      </AnimateOnScroll>
      <div className={styles.panels}>
        {SERVICE_CATEGORIES.map((cat, i) => (
          <AnimateOnScroll
            key={cat.title}
            as="article"
            className={styles.panel}
            animation="fadeUp"
            delay={i * 90}
            once
          >
            <div className={styles.panelMedia}>
              <Image
                src={ABOUT_SERVICE_IMAGES[cat.title as keyof typeof ABOUT_SERVICE_IMAGES]}
                alt={ABOUT_SERVICES.imageAlts[cat.title] ?? ''}
                fill
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 380px"
                className={styles.coverImage}
              />
            </div>
            <div>
              <h3 className={styles.panelTitle}>{cat.title}</h3>
              <ul className={styles.panelList}>
                {cat.items.map((item) => {
                  const href = ABOUT_SERVICES.links[item];
                  return (
                    <li key={item}>
                      {href ? (
                        <Link href={href}>
                          {item}
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </Link>
                      ) : (
                        item
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </div>
  );
}
