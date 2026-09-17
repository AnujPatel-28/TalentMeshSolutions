'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './blog.module.css';

export default function ArticleContents({ headings }: { headings: { id: string; text: string }[] }) {
  const [active, setActive] = useState('');
  const railRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = '';
        for (const heading of headings) {
          const element = document.getElementById(heading.id);
          if (element && element.getBoundingClientRect().top <= 120) current = heading.id;
        }
        // When the reader reaches the very bottom, keep the last section active
        // even if its heading has already scrolled past the offset.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && headings.length) {
          current = headings[headings.length - 1].id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headings]);

  // Keep the active link visible inside the sticky rail without moving the page.
  useEffect(() => {
    if (!active || !railRef.current) return;
    const rail = railRef.current;
    const link = rail.querySelector('[aria-current="location"]');
    if (!(link instanceof HTMLElement)) return;
    const railRect = rail.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const outOfView = linkRect.top < railRect.top + 40 || linkRect.bottom > railRect.bottom - 8;
    if (!outOfView) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollTo({
      top: rail.scrollTop + (linkRect.top - railRect.top) - 72,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [active]);

  const links = <ol>{headings.map(heading => <li key={heading.id}><a href={'#' + heading.id} aria-current={active === heading.id ? 'location' : undefined}>{heading.text}</a></li>)}</ol>;
  return <aside className={styles.contentsRail} ref={railRef}>
    <nav className={styles.desktopContents} aria-label="Article contents"><p>On this page</p>{links}</nav>
    <details className={styles.mobileContents}><summary>On this page</summary><nav aria-label="Article contents">{links}</nav></details>
  </aside>;
}
