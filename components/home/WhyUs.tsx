'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { WHY_TALENTMESH, INDUSTRY_ROWS } from '@/content/home';
import { createScrub } from './scrub';
import styles from './home.module.css';

// Full-screen photo behind each point's card, keyed by the point's `icon`.
const POINT_PHOTOS = {
    target: '/images/why/quality.webp',
    layers: '/images/why/flexible.webp',
    lifeBuoy: '/images/why/support.webp',
    briefcase: '/images/why/industry.webp',
};

// Must match the pinned-sequence media query in home.module.css.
// Any width, phones included; the height floor is what the tallest card needs
// under the navbar, which rules out a phone held sideways.
const PIN_QUERY = '(min-height: 640px) and (prefers-reduced-motion: no-preference)';

const LABEL = 'What Sets Us Apart';
const HEADING_LINES = ['More Than Recruitment.', 'A Hiring Partner.'];
const LEDE = 'We build strategic talent relationships to support your long-term organizational growth.';
const HEADING_WORDS = HEADING_LINES.map((line) => line.split(' '));
const LEDE_WORDS = LEDE.split(' ');
const WORD_COUNT = HEADING_WORDS.flat().length + LEDE_WORDS.length;

const MATCH_CHECKS = ['Skills', 'Experience', 'Notice period'];
const SUPPORT_STEPS = ['Coordinate', 'Verify', 'Onboard'];
const STAFFING_MODELS = ['Permanent', 'Contractual', 'Temporary', 'Remote', 'Volume'];
const INDUSTRY_NAMES = INDUSTRY_ROWS.flat().map((tag) => tag.name);
const half = Math.ceil(INDUSTRY_NAMES.length / 2);
const MARQUEE_ROWS = [INDUSTRY_NAMES.slice(0, half), INDUSTRY_NAMES.slice(half)];

const EASE = [0.22, 1, 0.36, 1] as const;

// The card pictures rest in their finished state in CSS; these only play the
// way in, once, as each card comes into view.
const ringVariants = {
    hidden: { strokeDashoffset: 92.5 },
    visible: { strokeDashoffset: 0, transition: { duration: 1.2, delay: 0.2, ease: EASE } },
};

const lineVariants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration: 1.2, delay: 0.2, ease: EASE } },
};

const chipVariants = {
    hidden: { backgroundColor: '#FFFFFF', color: '#5A6B7C', borderColor: '#D9E2EC' },
    visible: (i: number) => ({
        backgroundColor: '#E0F0FF',
        color: '#0056B3',
        borderColor: '#9CC7F0',
        transition: { duration: 0.3, delay: 0.2 + i * 0.18 },
    }),
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export default function WhyUs() {
    const reduceMotion = useReducedMotion();
    const pinRef = useRef<HTMLElement>(null);

    // Pinned photo sequence. Where PIN_QUERY matches, the stage of photos
    // pins for one viewport and scroll drives three things: the heading's
    // words fill in as it comes up the screen, the stage widens from an inset
    // frame to full bleed as it arrives, and then each card rides up to the
    // centre, rests, and leaves as the next photo fades in behind the next
    // card. Elsewhere the four photo cards simply stack.
    useEffect(() => {
        const pin = pinRef.current;
        if (!pin) return;
        const track = pin.querySelector(`.${styles.whyTrack}`) as HTMLElement;
        const stage = track.firstElementChild as HTMLElement;
        const items = Array.from(track.querySelectorAll('article'));
        const mq = window.matchMedia(PIN_QUERY);
        let vh = 0;
        let seg = 0; // px of scroll each card gets

        const clear = () => {
            delete pin.dataset.pinned;
            ['--why-dist', '--why-fill', '--why-grow'].forEach((name) => pin.style.removeProperty(name));
            items.forEach((item) => {
                item.style.removeProperty('--why-y');
                item.style.removeProperty('--why-show');
            });
        };

        // `v` is how far the track's top is above the viewport's: negative
        // while the stage is still on its way up, then 0 to the pin's length.
        const update = (v: number) => {
            if (!seg) return;
            pin.style.setProperty('--why-fill', clamp01((v + vh + 240) / (vh * 0.45 + 240)).toFixed(3));
            pin.style.setProperty('--why-grow', clamp01(1 + v / vh).toFixed(3));

            // Each card takes the first 60% of its stretch to arrive and
            // rests for the remainder. `at` is the card on the centre line,
            // fractional while two are trading places; it starts at -1 with
            // the first card one stage below.
            const u = clamp01(v / (seg * items.length)) * items.length;
            const k = Math.min(items.length - 1, Math.floor(u));
            const q = clamp01((u - k) / 0.6);
            const at = k - 1 + q * q * (3 - 2 * q);
            items.forEach((item, i) => {
                item.style.setProperty('--why-y', `${((i - at) * vh).toFixed(1)}px`);
                // The first photo is the stage's ground; the rest fade in over it.
                item.style.setProperty('--why-show', i ? clamp01(at - i + 1).toFixed(3) : '1');
            });
        };
        const scrub = createScrub(
            () => Math.min(seg * items.length, Math.max(-vh - 400, -track.getBoundingClientRect().top)),
            update
        );
        const layout = () => {
            if (mq.matches) {
                pin.dataset.pinned = '';
                // The stage's own height, not the window's: on a phone the
                // window changes height as the address bar slides away, and
                // the cards must not jump when it does.
                vh = stage.offsetHeight;
                seg = vh * 0.75;
                pin.style.setProperty('--why-dist', `${seg * items.length}px`);
                scrub.snap();
            } else {
                seg = 0;
                clear();
            }
        };
        const onScroll = () => {
            if (seg) scrub.kick();
        };

        layout();
        mq.addEventListener('change', layout);
        window.addEventListener('resize', layout);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            mq.removeEventListener('change', layout);
            window.removeEventListener('resize', layout);
            window.removeEventListener('scroll', onScroll);
            scrub.stop();
            clear();
        };
    }, []);

    const visuals = {
        target: (
            <div className={styles.whyMatch}>
                <div className={styles.whyRing}>
                    <svg viewBox="0 0 40 40">
                        <circle className={styles.whyRingTrack} cx="20" cy="20" r="16" />
                        <motion.circle
                            className={styles.whyRingArc}
                            cx="20"
                            cy="20"
                            r="16"
                            variants={reduceMotion ? undefined : ringVariants}
                        />
                    </svg>
                    <span className={styles.whyRingValue}>
                        92%
                        <small>match</small>
                    </span>
                </div>
                <div className={styles.whyMatchBody}>
                    <div className={styles.whyMatchRole}>Senior Backend Engineer</div>
                    <ul className={styles.whyChecks}>
                        {MATCH_CHECKS.map((label) => (
                            <li key={label}>
                                <Check strokeWidth={2.5} />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        ),
        layers: (
            <div className={styles.whyChips}>
                {STAFFING_MODELS.map((label, i) => (
                    <motion.span
                        key={label}
                        className={styles.whyChip}
                        custom={i}
                        variants={reduceMotion ? undefined : chipVariants}
                    >
                        {label}
                    </motion.span>
                ))}
            </div>
        ),
        lifeBuoy: (
            <div className={styles.whySteps}>
                <span className={styles.whyStepsTrack} />
                <motion.span
                    className={styles.whyStepsLine}
                    variants={reduceMotion ? undefined : lineVariants}
                />
                {SUPPORT_STEPS.map((label) => (
                    <span key={label} className={styles.whyStep}>
                        {label}
                    </span>
                ))}
            </div>
        ),
        briefcase: (
            <div className={styles.whyMarquee}>
                {MARQUEE_ROWS.map((row, r) => (
                    <div key={r} className={styles.whyMarqueeRow}>
                        {[...row, ...row].map((name, i) => (
                            <span key={i}>{name}</span>
                        ))}
                    </div>
                ))}
            </div>
        ),
    };

    // Each word carries its index so CSS can fill them in order from --why-fill.
    let wordIndex = 0;
    const word = (text: string) => (
        <span key={wordIndex} className={styles.whyWord} style={{ '--i': wordIndex++ } as React.CSSProperties}>
            {text}{' '}
        </span>
    );

    return (
        <section ref={pinRef} className="relative" id="why-talentmesh">
            <div className={`${styles.section} ${styles.whyIntro}`}>
                <div className={`${styles.inner} ${styles.whyIntroGrid}`}>
                    <p className={styles.whyLabel}>{LABEL}</p>
                    <div style={{ '--why-words': WORD_COUNT } as React.CSSProperties}>
                        <h2 className={styles.whyStatement}>
                            {HEADING_WORDS.map((line, i) => (
                                <span key={i} className={styles.whyLine}>
                                    {line.map(word)}
                                </span>
                            ))}
                        </h2>
                        <p className={styles.whyStatement}>{LEDE_WORDS.map(word)}</p>
                    </div>
                </div>
            </div>

            <div className={styles.whyTrack}>
                <div className={styles.whyStage}>
                    {WHY_TALENTMESH.points.map((pt, i) => {
                        // Two-tone title: the last word takes the accent line.
                        const cut = pt.title.lastIndexOf(' ');
                        return (
                            <article key={pt.title} className={styles.whyItem}>
                                <Image
                                    src={POINT_PHOTOS[pt.icon]}
                                    alt=""
                                    fill
                                    sizes="100vw"
                                    className={styles.whyPhoto}
                                />
                                <p className={`${styles.whyCaption} ${styles.whyCaptionLeft}`}>{pt.caption}</p>
                                <div className={styles.whyCard}>
                                    <span className={styles.whyCount} aria-hidden="true">
                                        {String(i + 1).padStart(2, '0')}
                                        <i> / {String(WHY_TALENTMESH.points.length).padStart(2, '0')}</i>
                                    </span>
                                    <h3 className={styles.whyTitle}>
                                        {pt.title.slice(0, cut)} <strong>{pt.title.slice(cut + 1)}</strong>
                                    </h3>
                                    {/* Decorative: each picture restates the copy below it. */}
                                    <motion.div
                                        className={styles.whyVisual}
                                        aria-hidden="true"
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.6 }}
                                    >
                                        {visuals[pt.icon]}
                                    </motion.div>
                                    <p className={styles.whyDesc}>{pt.description}</p>
                                </div>
                                <p className={`${styles.whyCaption} ${styles.whyCaptionRight}`}>{pt.tagline}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
