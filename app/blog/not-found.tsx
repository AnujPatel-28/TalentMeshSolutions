import Link from 'next/link';
import styles from './blog.module.css';
export default function NotFound() {
  return <main className={styles.journal}><div className={[styles.container, styles.empty].join(' ')}><h1>Article not found</h1><p>This link may be incorrect, or the article may no longer be available.</p><Link href="/blog">Back to the journal</Link></div></main>;
}
