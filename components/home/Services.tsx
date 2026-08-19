'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { COLLABERA_SERVICES } from '@/content/home';
import styles from './home.module.css';

export default function Services() {
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
            setPageCount(Math.ceil(COLLABERA_SERVICES.length / m.perPage));
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
        <section className={styles.section} id="services">
            <div className={styles.inner}>
                <div
                    className={styles.svcWrapper}
                    role="group"
                    aria-roledescription="carousel"
                    aria-label="Our suite of services"
                >
                    <div className={styles.svcTop}>
                        <div className={styles.svcHeadText}>
                            <p className={styles.eyebrow}>Our Suite of Services</p>
                            <h2 className={styles.h2}>Customized Solutions</h2>
                            <p className={styles.lede}>
                                End-to-end recruitment, staffing, and capability enablement tailored to your strategic business goals.
                            </p>
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
                        {COLLABERA_SERVICES.map((service) => (
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
        </section>
    );
}
