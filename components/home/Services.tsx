'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { HERO, TALENTMESH_SERVICES } from '@/content/home';
import styles from './home.module.css';

// Must match the pinned-side-scroll media query in home.module.css.
const PIN_QUERY = '(min-width: 1025px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';

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

    // Pinned side-scroll. Where PIN_QUERY matches, home.module.css pins the
    // section for one viewport and this maps vertical scroll onto it in two
    // phases. Intro: the title starts large in the middle of the stage with
    // no cards, then settles into its place while the cards come in from the
    // right edge. Travel: the rail moves from the first card's left edge on
    // the viewport's centre line to the last card's right edge on it. The
    // section is made taller by the scroll both phases take. Elsewhere the
    // rail stays the swipeable carousel above.
    useEffect(() => {
        const pin = pinRef.current;
        const rail = railRef.current;
        if (!pin || !rail) return;

        const mq = window.matchMedia(PIN_QUERY);
        let travel = 0; // px the rail moves sideways
        let dist = 0; // px of scroll that takes
        let startX = 0;
        let frame = 0;
        let intro = 0; // px of scroll for the intro
        let enterX = 0; // how far right of its start the rail waits
        let headDx = 0; // title offset from its place to the stage centre
        let headDy = 0;
        const title = pin.querySelector('h2') as HTMLElement;
        const fades = [title.nextElementSibling, pin.querySelector(`.${styles.svcProgress}`)] as HTMLElement[];
        const clearIntro = () => {
            title.style.transform = '';
            fades.forEach((el) => { el.style.opacity = ''; });
        };

        const update = () => {
            frame = 0;
            if (!dist) return;
            const scrolled = -pin.getBoundingClientRect().top;
            const q = Math.min(1, Math.max(0, scrolled / intro));
            const rest = 1 - q * q * (3 - 2 * q);
            const p = Math.min(1, Math.max(0, (scrolled - intro) / dist));
            title.style.transform = `translate3d(${(headDx * rest).toFixed(1)}px, ${(headDy * rest).toFixed(1)}px, 0) scale(${(1 + 0.3 * rest).toFixed(3)})`;
            // The lede and progress bar wait until the title has nearly landed.
            const fade = Math.min(1, Math.max(0, (q - 0.8) / 0.2)).toFixed(3);
            fades.forEach((el) => { el.style.opacity = fade; });
            rail.style.transform = `translate3d(${(startX + enterX * rest - p * travel).toFixed(1)}px, 0, 0)`;
            pin.style.setProperty('--svc-progress', p.toFixed(3));
        };
        const layout = () => {
            dist = 0;
            travel = 0;
            const first = rail.firstElementChild;
            // The last card, not the last child: the closing call to action
            // follows it in the rail and comes to rest in the right half.
            const last = rail.querySelector('article:last-of-type');
            if (mq.matches && first && last) {
                // Measure in the pinned layout, which is what will be shown.
                pin.dataset.pinned = '';
                rail.scrollLeft = 0;
                rail.style.transform = '';
                title.style.transform = '';
                const vw = document.documentElement.clientWidth;
                const text = document.createRange();
                text.selectNodeContents(title);
                const t = text.getBoundingClientRect();
                const stage = pin.firstElementChild!.getBoundingClientRect();
                title.style.transformOrigin = `${(t.width / 2).toFixed(1)}px 50%`;
                headDx = vw / 2 - (t.left + t.width / 2);
                headDy = stage.top + 30 + stage.height / 2 - (t.top + t.height / 2);
                intro = window.innerHeight * 0.6;
                enterX = vw / 2 + 40;
                const centre = vw / 2;
                startX = centre - first.getBoundingClientRect().left;
                travel = Math.max(0, startX - (centre - last.getBoundingClientRect().right));
                // Slightly geared up, so the intro does not lengthen the pin.
                dist = travel * 0.8;
            }
            if (dist) {
                pin.style.setProperty('--svc-dist', `${dist + intro}px`);
                update();
            } else {
                delete pin.dataset.pinned;
                pin.style.removeProperty('--svc-dist');
                rail.style.transform = '';
                clearIntro();
            }
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        // Keyboard: a focused link in a card that is still off to the side
        // would otherwise stay out of view, so scroll the page to bring it in.
        const onFocusIn = (e: FocusEvent) => {
            const card = (e.target as HTMLElement).closest(`article, .${styles.svcOutro}`);
            const first = rail.firstElementChild;
            if (!dist || !card || !first) return;
            const r = card.getBoundingClientRect();
            if (r.left >= 0 && r.right <= window.innerWidth) return;
            // Scroll to the point where this card sits on the centre line.
            const offset = r.left + r.width / 2 - first.getBoundingClientRect().left;
            const at = intro + (Math.min(travel, offset) / travel) * dist;
            window.scrollTo({ top: window.scrollY + pin.getBoundingClientRect().top + at });
        };

        layout();
        mq.addEventListener('change', layout);
        window.addEventListener('resize', layout);
        window.addEventListener('scroll', onScroll, { passive: true });
        rail.addEventListener('focusin', onFocusIn);
        return () => {
            mq.removeEventListener('change', layout);
            window.removeEventListener('resize', layout);
            window.removeEventListener('scroll', onScroll);
            rail.removeEventListener('focusin', onFocusIn);
            cancelAnimationFrame(frame);
            clearIntro();
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
                                <p className={styles.lede}>
                                    End-to-end recruitment, staffing, and capability enablement tailored to your strategic business goals.
                                </p>
                            </div>

                            <div className={styles.svcProgress} aria-hidden="true">
                                <i />
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

                            {/* Pinned side-scroll only (hidden otherwise): it
                                rides in behind the last card and ends in the
                                right half of the screen. */}
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
            </div>
        </section>
    );
}
