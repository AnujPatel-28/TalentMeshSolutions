'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TALENTMESH_SERVICES } from '@/content/home';
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
    // section for one viewport and this maps vertical scroll onto the rail's
    // translateX. The rail starts with the first card's left edge on the
    // viewport's centre line and ends with the last card's right edge on it;
    // the section is made taller by that travel distance. Elsewhere the rail
    // stays the swipeable carousel above.
    useEffect(() => {
        const pin = pinRef.current;
        const rail = railRef.current;
        if (!pin || !rail) return;

        const mq = window.matchMedia(PIN_QUERY);
        let dist = 0;
        let startX = 0;
        let frame = 0;

        const update = () => {
            frame = 0;
            if (!dist) return;
            const p = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / dist));
            rail.style.transform = `translate3d(${(startX - p * dist).toFixed(1)}px, 0, 0)`;
            pin.style.setProperty('--svc-progress', p.toFixed(3));
        };
        const layout = () => {
            dist = 0;
            const first = rail.firstElementChild;
            const last = rail.lastElementChild;
            if (mq.matches && first && last) {
                rail.scrollLeft = 0;
                rail.style.transform = '';
                const centre = document.documentElement.clientWidth / 2;
                startX = centre - first.getBoundingClientRect().left;
                dist = Math.max(0, startX - (centre - last.getBoundingClientRect().right));
            }
            if (dist) {
                pin.dataset.pinned = '';
                pin.style.setProperty('--svc-dist', `${dist}px`);
                update();
            } else {
                delete pin.dataset.pinned;
                pin.style.removeProperty('--svc-dist');
                rail.style.transform = '';
            }
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        // Keyboard: a focused link in a card that is still off to the side
        // would otherwise stay out of view, so scroll the page to bring it in.
        const onFocusIn = (e: FocusEvent) => {
            const card = (e.target as HTMLElement).closest('article');
            const first = rail.firstElementChild;
            if (!dist || !card || !first) return;
            const r = card.getBoundingClientRect();
            if (r.left >= 0 && r.right <= window.innerWidth) return;
            // Scroll to the point where this card sits on the centre line.
            const offset = r.left + r.width / 2 - first.getBoundingClientRect().left;
            window.scrollTo({ top: window.scrollY + pin.getBoundingClientRect().top + Math.min(dist, offset) });
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
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </section>
    );
}
