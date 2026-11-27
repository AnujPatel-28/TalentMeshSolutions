import HomeIntroSeen from './HomeIntroSeen';
import { bootIntro } from './introBoot';
import { LOGO_H, LOGO_LETTERS, LOGO_T, LOGO_W } from './introLogoPaths';
import styles from './home.module.css';

/** sessionStorage key and <html> class marking that the intro has played. */
const SEEN = 'tm-intro-seen';

/**
 * One-off intro cover for the home page: the logo on a white screen, then a
 * zoom into the centre of the logo. As the letters grow their ink fades and
 * they become windows onto the hero, until one letter fills the screen.
 *
 * Two layers. The ground is plain markup animated in CSS (see `.intro` in
 * home.module.css): white with the logo, there on first paint, fading out when
 * the zoom starts. Over it, a canvas that a worker draws the zoom on
 * (public/intro-dive-worker.js, started by introBoot.ts), so the zoom runs off
 * the main thread and stays smooth while the page hydrates. If the worker
 * cannot start, the ground still fades and the hero shows.
 *
 * It plays once per browser tab: the first inline script runs while the HTML
 * is parsed and hides it before first paint on a repeat load, and
 * HomeIntroSeen records the visit. Reduced-motion visitors never see it.
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
                <div className={styles.introGround}>
                    <svg className={styles.introLogo} viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} focusable="false">
                        <path id="tm-intro-letters" d={LOGO_LETTERS} fill="#000000" fillRule="evenodd" />
                        <path id="tm-intro-t" d={LOGO_T} fill="#006FB9" />
                    </svg>
                </div>
                <canvas id="tm-intro-canvas" className={styles.introCanvas} />
            </div>
            <script dangerouslySetInnerHTML={{ __html: `(${bootIntro.toString()})()` }} />
        </>
    );
}
