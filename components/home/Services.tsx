'use client';

import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
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

    // Pinned side-scroll. Where PIN_QUERY matches, home.module.css pins the
    // section for one viewport and this maps vertical scroll onto it in two
    // phases. Intro: the title and lede start in the middle of the stage with
    // no cards, then settle into their place while the cards come in from the
    // right edge. Travel: the rail moves from the first card's left edge on
    // the viewport's centre line to the last card's right edge on it; the card
    // on the centre line is full size and the others step back. The section
    // is made taller by the scroll both phases take. Elsewhere the rail stays
    // the swipeable carousel above.
    useEffect(() => {
        const pin = pinRef.current;
        const rail = railRef.current;
        if (!pin || !rail) return;

        const mq = window.matchMedia(PIN_QUERY);
        let travel = 0; // px the rail moves sideways
        let dist = 0; // px of scroll that takes
        let startX = 0;
        let intro = 0; // px of scroll for the intro
        let hold = 0; // px at its start during which nothing moves
        let enterX = 0; // how far right of its start the rail waits
        let centre = 0; // viewport centre line
        let cardW = 0;
        let pitch = 0;
        const title = pin.querySelector('h2') as HTMLElement;
        const words = Array.from(title.nextElementSibling!.children) as HTMLElement[];
        let wordX: number[] = []; // per word: its line's offset to centred
        const meter = pin.querySelector(`.${styles.svcMeter}`) as HTMLElement;
        const counter = meter.firstElementChild as HTMLElement;
        const cards = Array.from(rail.querySelectorAll('article'));
        let cardX: number[] = []; // each card's centre with the rail at rest
        // Offsets from the heading's place to its centred intro spot.
        const head = { tx: 0, ty: 0, ly: 0 };

        const clearPinned = () => {
            rail.style.transform = '';
            title.style.transform = '';
            words.forEach((word) => { word.style.transform = ''; });
            meter.style.opacity = '';
            cards.forEach((card) => {
                card.style.removeProperty('--svc-scale');
                card.style.removeProperty('--svc-dim');
            });
        };

        // `scrolled` is how far the page is into the pinned stretch, already
        // smoothed by the scrub below.
        const update = (scrolled: number) => {
            if (!dist) return;
            // The heading rests in the centre for `hold`, then takes the rest
            // of the intro to settle.
            const q = Math.min(1, Math.max(0, (scrolled - hold) / (intro - hold)));
            const rest = 1 - q * q * (3 - 2 * q);
            const p = Math.min(1, Math.max(0, (scrolled - intro) / dist));
            const x = startX + enterX * rest - p * travel;

            title.style.transform = `translate3d(${(head.tx * rest).toFixed(1)}px, ${(head.ty * rest).toFixed(1)}px, 0) scale(${(1 + 0.3 * rest).toFixed(3)})`;
            // Each lede line is centred at first and slides to the left edge.
            words.forEach((word, i) => {
                word.style.transform = `translate3d(${(wordX[i] * rest).toFixed(1)}px, ${(head.ly * rest).toFixed(1)}px, 0)`;
            });
            // The counter and progress bar wait until the heading has landed.
            meter.style.opacity = Math.min(1, Math.max(0, (q - 0.8) / 0.2)).toFixed(3);
            rail.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
            pin.style.setProperty('--svc-progress', p.toFixed(3));
            // The intro backdrop fades out as the heading settles.
            pin.style.setProperty('--svc-intro', rest.toFixed(3));

            // A card is full size while the centre line is on it, and steps
            // back the further its nearest edge is from that line.
            let current = 0;
            let nearest = Infinity;
            cards.forEach((card, i) => {
                const off = Math.abs(cardX[i] + x - centre);
                if (off < nearest) {
                    nearest = off;
                    current = i;
                }
                const away = Math.min(1, Math.max(0, (off - cardW / 2) / (pitch * 0.6)));
                card.style.setProperty('--svc-scale', (1 - 0.05 * away).toFixed(3));
                card.style.setProperty('--svc-dim', (1 - 0.22 * away).toFixed(3));
            });
            const label = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
            if (counter.textContent !== label) counter.textContent = label;
        };
        const scrub = createScrub(
            () => Math.min(intro + dist, Math.max(0, -pin.getBoundingClientRect().top)),
            update
        );
        const layout = () => {
            dist = 0;
            travel = 0;
            if (mq.matches && cards.length) {
                // Measure in the pinned layout, which is what will be shown.
                pin.dataset.pinned = '';
                rail.scrollLeft = 0;
                clearPinned();
                centre = document.documentElement.clientWidth / 2;
                const rects = cards.map((card) => card.getBoundingClientRect());
                cardX = rects.map((r) => r.left + r.width / 2);
                cardW = rects[0].width;
                pitch = rects.length > 1 ? rects[1].left - rects[0].left : cardW;

                // Heading: the title and every lede line are centred on the
                // centre line, and the group is centred in the stage below
                // the navbar. The title also grows by 30%, so the lede drops
                // by the extra height.
                const range = document.createRange();
                range.selectNodeContents(title);
                const t = range.getBoundingClientRect();
                const w = words.map((word) => word.getBoundingClientRect());
                const lines = new Map<number, { left: number; right: number }>();
                w.forEach((r) => {
                    const line = lines.get(Math.round(r.top));
                    if (line) line.right = r.right;
                    else lines.set(Math.round(r.top), { left: r.left, right: r.right });
                });
                wordX = w.map((r) => {
                    const line = lines.get(Math.round(r.top))!;
                    return centre - (line.left + line.right) / 2;
                });
                const stage = pin.firstElementChild!.getBoundingClientRect();
                const dy = stage.top + 30 + stage.height / 2 - (t.top + w[w.length - 1].bottom) / 2;
                title.style.transformOrigin = `${(t.width / 2).toFixed(1)}px 50%`;
                head.tx = centre - (t.left + t.width / 2);
                head.ty = dy - t.height * 0.15;
                head.ly = dy + t.height * 0.15;

                intro = window.innerHeight * 1.05;
                hold = window.innerHeight * 0.15;
                enterX = centre + 40;
                startX = centre - rects[0].left;
                travel = Math.max(0, startX - (centre - rects[rects.length - 1].right));
                // Slightly geared up, so the intro does not lengthen the pin.
                dist = travel * 0.8;
            }
            if (dist) {
                pin.style.setProperty('--svc-dist', `${dist + intro}px`);
                scrub.snap();
            } else {
                delete pin.dataset.pinned;
                pin.style.removeProperty('--svc-dist');
                clearPinned();
            }
        };
        const onScroll = () => {
            if (dist) scrub.kick();
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
            {/* Pinned side-scroll only: behind the centred intro heading. */}
            <div className={styles.svcBackdrop} aria-hidden="true" />
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
                                {/* One span per word, so the pinned intro can
                                    centre each line and then slide it back to
                                    the left edge (text-align cannot animate). */}
                                <p className={styles.lede}>
                                    {LEDE.split(' ').map((word, i) => (
                                        <Fragment key={i}>
                                            <span className={styles.svcLedeWord}>{word}</span>{' '}
                                        </Fragment>
                                    ))}
                                </p>
                            </div>

                            {/* Pinned side-scroll only: which card is on the
                                centre line, and how far along the rail is. */}
                            <div className={styles.svcMeter} aria-hidden="true">
                                <span className={styles.svcCounter}>01 / 06</span>
                                <div className={styles.svcProgress}>
                                    <i />
                                </div>
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
