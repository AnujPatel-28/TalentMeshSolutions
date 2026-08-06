"use client";

import styles from './sections.module.css';
import { MotionAccordion, MotionAccordionItem } from '@/components/ui';

const faqItems: MotionAccordionItem[] = [
  {
    question: "How does the AI matching work?",
    answer: "Our AI analyzes your skills, experience, and preferences against thousands of job descriptions to find the perfect mutual fit, reducing hiring time by 75%."
  },
  {
    question: "Is my data private?",
    answer: "Yes. We are GDPR compliant and use enterprise-grade encryption. Employers only see your full profile when you approve a match request."
  },
  {
    question: "Can I use it for free?",
    answer: "Absolutely. Job seekers can create a profile and browse matches for free. We also offer a free tier for small businesses posting their first job."
  },
  {
    question: "Do you support remote jobs?",
    answer: "Yes! Over 60% of the roles on TalentMesh are remote-friendly or fully remote, spanning across 40+ countries."
  }
];

const FAQ = () => {
  return (
    <section className={styles.faq}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div className={styles.badge}>Support</div>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        </div>

        <div className="max-w-3xl mx-auto mt-8">
          <MotionAccordion items={faqItems} gap={14} />
        </div>
      </div>
    </section>
  );
};

export default FAQ;
