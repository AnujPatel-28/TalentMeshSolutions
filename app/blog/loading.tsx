import styles from './blog.module.css';
export default function Loading() {
  return <main className={styles.journal}><div className={styles.container} role="status" aria-live="polite"><p>Loading the journal…</p><div className={styles.loading} aria-hidden="true" /></div></main>;
}
