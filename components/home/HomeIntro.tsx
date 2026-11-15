import type { CSSProperties } from 'react';
import Image from 'next/image';
import HomeIntroSeen from './HomeIntroSeen';
import styles from './home.module.css';

/** sessionStorage key and <html> class marking that the intro has played. */
const SEEN = 'tm-intro-seen';

/**
 * One-off intro cover for the home page: a white screen in four columns with
 * the logo, which lift one after another to reveal the hero.
 *
 * The cover is plain markup animated in CSS (see `.intro` in home.module.css),
 * so it is there on first paint and still lifts if the bundle is slow or fails.
 * It plays once per browser tab: the inline script runs while the HTML is
 * parsed and hides it before first paint on a repeat load, and HomeIntroSeen
 * records the visit. Reduced-motion visitors never see it.
 */
export default function HomeIntro() {
    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: `try{if(sessionStorage.getItem('${SEEN}'))document.documentElement.classList.add('${SEEN}')}catch(e){}`,
                }}
            />
            <HomeIntroSeen flag={SEEN} />
            <div className={styles.intro} aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={styles.introCol} style={{ '--i': i } as CSSProperties} />
                ))}
                <Image
                    src="/talentmesh-solutions-logo-transparent.png"
                    alt=""
                    width={2172}
                    height={724}
                    sizes="260px"
                    priority
                    className={styles.introLogo}
                />
            </div>
        </>
    );
}
