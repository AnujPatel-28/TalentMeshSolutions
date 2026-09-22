'use client';
import Link from 'next/link';
import styles from './blog.module.css';
export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={styles.journal}><div className={[styles.container, styles.empty].join(' ')}><h1>We couldn’t load this page.</h1><p>Please try again in a moment.</p><button type="button" className={styles.retry} onClick={reset}>Try again</button><p><Link href="/blog">Back to the journal</Link></p></div></main>;
}
