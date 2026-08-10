import { PILLARS } from '@/content/home';
import styles from './home.module.css';

export default function WhyUs() {
    return (
        <section className={styles.section} id="why-talentmesh">
            <div className={styles.inner}>
                <div className={styles.head}>
                    <p className={styles.eyebrow}>Why TalentMesh</p>
                    <h2 className={styles.h2}>
                        A hiring partner, <span className={styles.accent}>not a résumé vendor</span>
                    </h2>
                    <p className={styles.lede}>
                        We aim to be the partner you call first — providing skilled talent, seamless
                        coordination and value-added support that helps you build a high-performing team.
                    </p>
                </div>

                <div className={styles.pillarGrid}>
                    {PILLARS.map((pillar) => (
                        <article key={pillar.title} className={styles.pillar}>
                            <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                            <p className={styles.pillarDesc}>{pillar.description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
