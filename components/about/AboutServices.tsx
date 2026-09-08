import { SERVICE_CATEGORIES } from '@/content/home';
import styles from './about.module.css';

export default function AboutServices() {
  return (
    <div className={styles.inner}>
      <h2 className={styles.h2}>What we do</h2>
      <p className={styles.lede}>
        End-to-end support across the recruitment lifecycle — sourcing, screening, coordination,
        verification and onboarding.
      </p>
      <div className={`${styles.cardGrid3} ${styles.servicesGrid}`}>
        {SERVICE_CATEGORIES.map((cat) => (
          <article key={cat.title} className={styles.card}>
            <h3 className={styles.cardTitle}>{cat.title}</h3>
            <ul className={styles.cardList}>
              {cat.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
