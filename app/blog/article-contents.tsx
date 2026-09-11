'use client';

import { useEffect, useState } from 'react';
import styles from './blog.module.css';

export default function ArticleContents({ headings }: { headings: { id: string; text: string }[] }) {
  const [active, setActive] = useState('');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = '';
        for (const heading of headings) {
          const element = document.getElementById(heading.id);
          if (element && element.getBoundingClientRect().top <= 160) current = heading.id;
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

  const links = <ol>{headings.map(heading => <li key={heading.id}><a href={'#' + heading.id} aria-current={active === heading.id ? 'location' : undefined}>{heading.text}</a></li>)}</ol>;
  return <aside className={styles.contentsRail}>
    <nav className={styles.desktopContents} aria-label="Article contents"><p>On this page</p>{links}</nav>
    <details className={styles.mobileContents}><summary>On this page</summary><nav aria-label="Article contents">{links}</nav></details>
  </aside>;
}
