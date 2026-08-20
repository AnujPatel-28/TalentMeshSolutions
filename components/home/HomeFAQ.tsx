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
        <section className={styles.faqSection} id="faq">
            <div className={styles.inner}>
                <div className={styles.faqLayout}>
                    {/* Left Column: Heading & Description */}
                    <div className={styles.faqLeftCol}>
                        <h2 className={styles.faqHeading}>
                            Frequently asked <br className={styles.faqBr} />questions.
                        </h2>
                        <p className={styles.faqSubtext}>
                            TalentMesh is designed to address common inquiries effectively, ensuring a seamless hiring partnership.
                        </p>
                    </div>

                    {/* Right Column: FAQ Accordion */}
                    <div className={styles.faqRightCol}>
                        <MotionAccordion
                            variant="modern"
                            defaultOpenIndex={0}
                            items={FAQS.map((faq) => ({ question: faq.question, answer: faq.answer }))}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
