'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { HERO, TALENTMESH_SERVICES } from '@/content/home';
import { createScrub } from './scrub';
import styles from './home.module.css';

// Must match the pinned-side-scroll media query in home.module.css.
const PIN_QUERY = '(min-width: 1025px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';

const LEDE = 'End-to-end recruitment, staffing, and capability enablement tailored to your strategic business goals.';

export default function Services() {
    const pinRef = useRef<HTMLElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const [pageCount, setPageCount] = useState(1);
    const [activePage, setActivePage] = useState(0);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    // Cards are sized to fit a whole number per view, so a "page" is that many card pitches.
    const measure = useCallback(() => {
        const rail = railRef.current;
        const first = rail?.firstElementChild as HTMLElement | null;
        if (!rail || !first) return null;
        const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        const pitch = first.offsetWidth + gap;
        const perPage = Math.max(1, Math.round(rail.clientWidth / pitch));
        return { rail, pitch, perPage, pageWidth: perPage * pitch };
    }, []);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;

        const update = () => {
            const m = measure();
            if (!m) return;
            setPageCount(Math.ceil(TALENTMESH_SERVICES.length / m.perPage));
            setActivePage(Math.round(rail.scrollLeft / m.pageWidth));
            setAtStart(rail.scrollLeft <= 1);
            setAtEnd(rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 1);
        };

        update();
        rail.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            rail.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [measure]);

    // Index buttons call into the pinned effect, which owns the measurements.
    const jumpRef = useRef<(chapter: number) => void>(() => {});

    // Pinned chapters. Where PIN_QUERY matches, home.module.css pins the
    // section for one viewport and this maps vertical scroll onto a run of
    // chapters, one per service and a closing one. The heading opens centred
    // over the people backdrop; each chapter's photo then wipes in from the
    // right edge and pushes the previous one off to the left, its title comes
    // in on the left under a rolling number, and its card slides in from the
    // right. After a short dwell the next chapter takes over. Elsewhere the
    // rail stays the swipeable carousel above.
    useEffect(() => {
        const pin = pinRef.current;
        const rail = railRef.current;
        if (!pin || !rail) return;

        const mq = window.matchMedia(PIN_QUERY);
        const all = (cls: string) => Array.from(pin.querySelectorAll<HTMLElement>(`.${cls}`));
        const stage = pin.firstElementChild as HTMLElement;
        const head = pin.querySelector(`.${styles.svcHeadText}`) as HTMLElement;
        const backdrop = pin.querySelector(`.${styles.svcBackdrop}`) as HTMLElement;
        const scenes = all(styles.svcScene); // services, then the closing one
        const sceneImgs = scenes.map((scene) => scene.firstElementChild as HTMLElement);
        const edge = pin.querySelector(`.${styles.svcWipeEdge}`) as HTMLElement;
        const captions = pin.querySelector(`.${styles.svcCaptions}`) as HTMLElement;
        const strip = pin.querySelector(`.${styles.svcNumberStrip}`) as HTMLElement;
        const titles = all(styles.svcCaptionTitle);
        const index = pin.querySelector(`.${styles.svcIndex}`) as HTMLElement;
        const indexItems = Array.from(index.querySelectorAll('li'));
        const cards = Array.from(rail.querySelectorAll('article'));
        const outro = rail.querySelector(`.${styles.svcOutro}`) as HTMLElement;
        const n = cards.length;

        let hold = 0; // px at the start during which nothing moves
        let T = 0; // px of scroll a chapter change takes
        let L = 0; // px per chapter: its change plus a dwell
        let dist = 0; // total px of pinned scroll
        let vw = 0;

        const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
        const ease = (v: number) => v * v * (3 - 2 * v);
        const animated = [head, backdrop, edge, captions, strip, index, outro, ...scenes, ...sceneImgs, ...titles, ...cards];

        const clearPinned = () => {
            animated.forEach((el) => {
                el.style.transform = '';
                el.style.opacity = '';
                el.style.clipPath = '';
                el.style.pointerEvents = '';
            });
        };

        // `scrolled` is how far the page is into the pinned stretch, already
        // smoothed by the scrub below.
        const update = (scrolled: number) => {
            if (!dist) return;
            const s = scrolled - hold;
            // t[k]: chapter k's way in (1..n services, n+1 the closing one).
            const t = [1];
            for (let k = 1; k <= n + 1; k++) t[k] = ease(clamp01((s - (k - 1) * L) / T));
            t[n + 2] = 0;
            const pos = t.slice(1, n + 2).reduce((a, b) => a + b, 0);

            // Heading lifts away as the first photo comes in.
            const h = clamp01(t[1] * 1.8);
            head.style.opacity = (1 - h).toFixed(3);
            head.style.transform = `translate3d(0, ${(-48 * h).toFixed(1)}px, 0)`;
            backdrop.style.transform = `translate3d(${(-12 * t[1]).toFixed(2)}%, 0, 0)`;

            // Each photo is revealed from the right edge, then pushed left by
            // the next while it drifts slowly the whole time it is on screen.
            let wipe = -1;
            scenes.forEach((scene, i) => {
                const k = i + 1;
                const inP = t[k];
                const outP = t[k + 1];
                scene.style.clipPath = `inset(0 0 0 ${((1 - inP) * 100).toFixed(2)}%)`;
                scene.style.transform = `translate3d(${(-12 * outP).toFixed(2)}%, 0, 0)`;
                const drift = Math.min(2, Math.max(0, pos - (k - 1)));
                sceneImgs[i].style.transform = `translate3d(${((1 - drift) * 2.5).toFixed(2)}%, 0, 0) scale(1.08)`;
                if (inP > 0 && inP < 1) wipe = inP;
            });
            edge.style.opacity = wipe < 0 ? '0' : Math.sin(Math.PI * wipe).toFixed(3);
            edge.style.transform = `translate3d(${((1 - Math.max(0, wipe)) * vw).toFixed(1)}px, 0, 0)`;

            // Number, titles and index are there from the first service to the last.
            const shown = Math.min(clamp01((t[1] - 0.4) / 0.6), 1 - t[n + 1]);
            captions.style.opacity = shown.toFixed(3);
            index.style.opacity = shown.toFixed(3);
            index.style.pointerEvents = shown > 0.5 ? 'auto' : 'none';
            // Rolls like a mechanical counter while the photos change.
            strip.style.transform = `translate3d(0, ${(-(Math.min(n, Math.max(1, pos)) - 1) / n * 100).toFixed(3)}%, 0)`;

            titles.forEach((title, i) => {
                const cin = ease(clamp01((t[i + 1] - 0.4) / 0.6));
                const cout = t[i + 2];
                title.style.opacity = Math.min(cin, 1 - cout).toFixed(3);
                title.style.transform = `translate3d(${((1 - cin) * 90 - cout * 90).toFixed(1)}px, 0, 0)`;
            });

            cards.forEach((card, i) => {
                const cin = ease(clamp01((t[i + 1] - 0.45) / 0.55));
                const cout = t[i + 2];
                const op = Math.min(cin, clamp01(1 - cout * 1.6));
                card.style.opacity = op.toFixed(3);
                card.style.transform = `translate3d(${((1 - cin) * vw * 0.55 - cout * 120).toFixed(1)}px, -50%, 0)`;
                card.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
            });

            const oin = ease(clamp01((t[n + 1] - 0.45) / 0.55));
            outro.style.opacity = oin.toFixed(3);
            outro.style.transform = `translate3d(-50%, calc(-50% + ${((1 - oin) * 40).toFixed(1)}px), 0)`;
            outro.style.pointerEvents = oin > 0.5 ? 'auto' : 'none';

            const active = Math.min(n - 1, Math.max(0, Math.round(pos) - 1));
            indexItems.forEach((item, i) => {
                item.style.setProperty('--svc-fill', clamp01((s - i * L) / L).toFixed(3));
                if (i === active) item.setAttribute('data-active', '');
                else item.removeAttribute('data-active');
            });
        };
        const scrub = createScrub(
            () => Math.min(dist, Math.max(0, -pin.getBoundingClientRect().top)),
            update
        );
        const layout = () => {
            dist = 0;
            if (mq.matches && n) {
                pin.dataset.pinned = '';
                vw = document.documentElement.clientWidth;
                const H = window.innerHeight;
                hold = H * 0.15;
                T = H * 0.75;
                L = T + H * 0.45;
                dist = hold + (n + 1) * L;
            }
            if (dist) {
                pin.style.setProperty('--svc-dist', `${dist}px`);
                scrub.snap();
            } else {
                delete pin.dataset.pinned;
                pin.style.removeProperty('--svc-dist');
                clearPinned();
            }
        };
        // Page scroll position at which chapter `c` (0-based) is settled.
        const chapterTop = (c: number) =>
            window.scrollY + pin.getBoundingClientRect().top + hold + c * L + T + (L - T) * 0.3;
        jumpRef.current = (c) => {
            if (dist) window.scrollTo({ top: chapterTop(c), behavior: 'smooth' });
        };
        const onScroll = () => {
            if (dist) scrub.kick();
        };
        // Keyboard: a focused link in a card that is not the current chapter
        // would be invisible, so scroll the page to that card's chapter.
        const onFocusIn = (e: FocusEvent) => {
            if (!dist) return;
            const card = (e.target as HTMLElement).closest('article');
            const c = card ? cards.indexOf(card) : (e.target as HTMLElement).closest(`.${styles.svcOutro}`) ? n : -1;
            if (c >= 0) window.scrollTo({ top: chapterTop(c) });
        };
        // Light cursor: the photo's tint lifts around the pointer.
        const onMove = (e: PointerEvent) => {
            if (!dist || e.pointerType !== 'mouse') return;
            stage.style.setProperty('--svc-mx', `${e.clientX}px`);
            stage.style.setProperty('--svc-my', `${e.clientY}px`);
        };

        layout();
        mq.addEventListener('change', layout);
        window.addEventListener('resize', layout);
        window.addEventListener('scroll', onScroll, { passive: true });
        rail.addEventListener('focusin', onFocusIn);
        stage.addEventListener('pointermove', onMove);
        return () => {
            mq.removeEventListener('change', layout);
            window.removeEventListener('resize', layout);
            window.removeEventListener('scroll', onScroll);
            rail.removeEventListener('focusin', onFocusIn);
            stage.removeEventListener('pointermove', onMove);
            scrub.stop();
            clearPinned();
        };
    }, []);

    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

    const scrollByPage = useCallback(
        (direction: 1 | -1) => {
            const m = measure();
            if (!m) return;
            m.rail.scrollBy({ left: direction * m.pageWidth, behavior });
        },
        [measure, behavior]
    );

    const goToPage = useCallback(
        (page: number) => {
            const m = measure();
            if (!m) return;
            const max = m.rail.scrollWidth - m.rail.clientWidth;
            m.rail.scrollTo({ left: Math.min(page * m.pageWidth, max), behavior });
        },
        [measure, behavior]
    );

    return (
        <section ref={pinRef} className={`relative ${styles.svcPin}`} id="services">
            <div className={styles.svcStage}>
            {/* Pinned chapters only: the people backdrop behind the opening
                heading, then one full-screen photo per service and the
                backdrop again for the closing chapter. */}
            <div className={styles.svcScenes} aria-hidden="true">
                <div className={styles.svcBackdrop} />
                {TALENTMESH_SERVICES.map((service) => (
                    <div key={service.title} className={`${styles.svcScene} ${styles.svcScenePhoto}`}>
                        <div className={styles.svcSceneImg}>
                            <Image src={service.image} alt="" fill sizes="100vw" className={styles.svcCardImg} />
                        </div>
                    </div>
                ))}
                <div className={styles.svcScene}>
                    <div className={`${styles.svcSceneImg} ${styles.svcBackdrop}`} />
                </div>
                <i className={styles.svcWipeEdge} />
            </div>
            <div className={styles.section}>
                <div className={styles.inner}>
                    <div
                        className={styles.svcWrapper}
                        role="group"
                        aria-roledescription="carousel"
                        aria-label="Our suite of services"
                    >
                        <div className={styles.svcTop}>
                            <div className={styles.svcHeadText}>
                                <h2 className={styles.h2}>Customized Solutions</h2>
                                <p className={styles.lede}>{LEDE}</p>
                            </div>

                            <div className={styles.svcControls}>
                                <button
                                    onClick={() => scrollByPage(-1)}
                                    className={styles.svcArrowBtn}
                                    disabled={atStart}
                                    aria-controls="services-rail"
                                    aria-label="Previous services"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className={styles.svcDots}>
                                    {Array.from({ length: pageCount }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => goToPage(i)}
                                            className={`${styles.svcDot} ${i === activePage ? styles.svcDotActive : ''}`}
                                            aria-current={i === activePage}
                                            aria-controls="services-rail"
                                            aria-label={`Go to page ${i + 1} of ${pageCount}`}
                                        />
                                    ))}
                                </div>

                                {/* Carousel position. This used to occupy the
                                    section marker's index slot, which is why the
                                    page's `[NN]` sequence had no `[01]`. */}
                                <span className={styles.svcCount} aria-live="polite">
                                    [{activePage + 1}/{pageCount}]
                                </span>

                                <button
                                    onClick={() => scrollByPage(1)}
                                    className={styles.svcArrowBtn}
                                    disabled={atEnd}
                                    aria-controls="services-rail"
                                    aria-label="Next services"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div
                            id="services-rail"
                            className={styles.svcRail}
                            ref={railRef}
                            tabIndex={0}
                            aria-label="Services, scrollable list"
                        >
                            {TALENTMESH_SERVICES.map((service) => (
                                <article key={service.title} className={styles.svcCard}>
                                    <div className={styles.svcImageWrapper}>
                                        <Image
                                            src={service.image}
                                            alt=""
                                            fill
                                            sizes="(max-width: 720px) 90vw, (max-width: 1024px) 45vw, 380px"
                                            className={styles.svcCardImg}
                                        />
                                    </div>

                                    <div className={styles.svcCardBody}>
                                        <h3 className={styles.svcCardTitle}>{service.title}</h3>
                                        <p className={styles.svcCardDesc}>{service.description}</p>

                                        <div className={styles.svcPillGroup}>
                                            {service.actionPills.map((pill) => (
                                                <Link
                                                    key={pill.label}
                                                    href={pill.href}
                                                    className={styles.svcPillBtn}
                                                >
                                                    {pill.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {/* Pinned chapters only (hidden otherwise): the
                                closing chapter, centred over the backdrop. */}
                            <div className={styles.svcOutro}>
                                <h3>Not sure which model fits?</h3>
                                <p>Tell us the role and we will recommend the right way to hire for it.</p>
                                <Link href={HERO.primaryCta.href} className={styles.btnPrimary}>
                                    {HERO.primaryCta.label}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pinned chapters only. The cards carry the content; these repeat
                each service's name as a large title for the chapter. */}
            <div className={styles.svcCaptions} aria-hidden="true">
                <div className={styles.svcNumber}>
                    <span className={styles.svcNumberStrip}>
                        {TALENTMESH_SERVICES.map((_, i) => (
                            <span key={i}>{String(i + 1).padStart(2, '0')}</span>
                        ))}
                    </span>
                </div>
                <div className={styles.svcCaptionTitles}>
                    {TALENTMESH_SERVICES.map((service) => (
                        <p key={service.title} className={styles.svcCaptionTitle}>{service.title}</p>
                    ))}
                </div>
            </div>
            <nav className={styles.svcIndex} aria-label="Services">
                <span className={styles.svcIndexLabel}>Customized Solutions</span>
                <ol>
                    {TALENTMESH_SERVICES.map((service, i) => (
                        <li key={service.title}>
                            <button type="button" onClick={() => jumpRef.current(i)}>
                                <span>{service.title}</span>
                                <i />
                            </button>
                        </li>
                    ))}
                </ol>
            </nav>
            </div>
        </section>
    );
}
