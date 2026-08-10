'use client';

import { MotionAccordion } from '@/components/ui/MotionAccordion';
import { FAQS } from '@/content/home';
import styles from './home.module.css';

/**
 * Rendered visibly on the page — it backs the FAQPage JSON-LD in app/page.tsx,
 * which is only valid if the same Q&As are present in the markup.
 */
export default function HomeFAQ() {
    return (
        <section className={styles.section} id="faq">
            <div className={styles.inner}>
                <div className={styles.head}>
                    <p className={styles.eyebrow}>Questions</p>
                    <h2 className={styles.h2}>Before you brief us</h2>
                </div>

                <div className={styles.faqWrap}>
                    <MotionAccordion
                        items={FAQS.map((faq) => ({ question: faq.question, answer: faq.answer }))}
                    />
                </div>
            </div>
        </section>
    );
}
