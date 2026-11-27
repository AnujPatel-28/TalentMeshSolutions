import HomeIntroSeen from './HomeIntroSeen';
import { LOGO_H, LOGO_LETTERS, LOGO_T, LOGO_W } from './introLogoPaths';
import styles from './home.module.css';

/** sessionStorage key and <html> class marking that the intro has played. */
const SEEN = 'tm-intro-seen';

/** A rectangle far larger than any screen at the logo's starting size, in logo units. */
const COVER = `M-40000 -40000H${LOGO_W + 40000}V${LOGO_H + 40000}H-40000Z`;

/**
 * One-off intro cover for the home page: the logo on a white screen, then a
 * zoom into the centre of the logo. The white is one shape with the letters cut
 * out of it, so as the letters grow and their ink fades they become windows
 * onto the hero, until one letter fills the screen.
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
                <svg className={styles.introLogo} viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} focusable="false">
                    <g className={styles.introZoom}>
                        <path className={styles.introCover} d={`${COVER}${LOGO_LETTERS}${LOGO_T}`} fillRule="evenodd" />
                        <g className={styles.introInk}>
                            <path d={LOGO_LETTERS} fill="#000000" fillRule="evenodd" />
                            <path d={LOGO_T} fill="#006FB9" />
                        </g>
                    </g>
                </svg>
            </div>
        </>
    );
}
