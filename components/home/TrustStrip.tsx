'use client';

import { useState } from 'react';
import Image from 'next/image';
import { POSITIONING } from '@/content/home';
import styles from './home.module.css';

const PROOF_POINTS = ['48–72h Shortlists', '100% Vetted Talent'];

/**
 * "Recruitment Engineered for Scale": three photo panels. One is open and shows
 * its headline and copy; the others fold to a strip with their number and
 * title. Side by side on desktop, stacked on phones (see `.scale*` in
 * home.module.css). A panel opens on click, on keyboard focus, or on mouse
 * hover; nothing rotates on a timer.
 */
export default function TrustStrip() {
    const [open, setOpen] = useState(0);

    return (
        <section className="relative" aria-label={POSITIONING.sectionTitle}>
            <div className={styles.section}>
                <div className={styles.inner}>
                    <div className={styles.scaleHead}>
                        <h2 className={styles.h2}>
                            Recruitment Engineered <em className={styles.scaleAccent}>for Scale</em>
                        </h2>
                        <ul className={styles.scaleChips}>
                            {PROOF_POINTS.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.scaleRow}>
                        {POSITIONING.columns.map((column, i) => {
                            const isOpen = i === open;
                            return (
                                <div
                                    key={column.title}
                                    className={`${styles.scalePanel} ${isOpen ? styles.scalePanelOpen : ''}`}
                                    onPointerEnter={(e) => {
                                        if (e.pointerType === 'mouse') setOpen(i);
                                    }}
                                >
                                    {/* The button's ::after covers the whole
                                        panel, so anywhere on it is the target. */}
                                    <button
                                        type="button"
                                        className={styles.scaleTab}
                                        aria-expanded={isOpen}
                                        aria-controls={`scale-panel-${i}`}
                                        onClick={() => setOpen(i)}
                                        onFocus={() => setOpen(i)}
                                    >
                                        <span className={styles.scaleNum}>{String(i + 1).padStart(2, '0')}</span>
                                        <span className={styles.scaleTitle}>{column.title}</span>
                                    </button>

                                    <div id={`scale-panel-${i}`} className={styles.scaleBody} aria-hidden={!isOpen}>
                                        <h3>{column.rightHeading}</h3>
                                        <p>{column.rightIntro}</p>
                                    </div>

                                    <Image
                                        src={column.rightImage}
                                        alt=""
                                        width={1500}
                                        height={1000}
                                        sizes="(max-width: 860px) 90vw, 640px"
                                        className={styles.scaleImg}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
