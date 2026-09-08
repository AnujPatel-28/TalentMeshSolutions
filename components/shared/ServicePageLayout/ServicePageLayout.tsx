"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ServicePageLayout.module.css';

export interface ServicePageLayoutProps {
    // Hero
    heroTitle: React.ReactNode;
    heroTagline: React.ReactNode;
    heroDescription: React.ReactNode;
    heroCtaText?: string;
    imageSrc?: string;
    imageAlt?: string;

    // Approach Section
    approachCategory: React.ReactNode;
    approachHeadingDark: React.ReactNode;
    approachHeadingAccent: React.ReactNode;
    approachLead?: React.ReactNode;
    approachBody?: React.ReactNode;
    // `num` matches what the service pages actually pass (47 of 55 call sites);
    // the interface previously said `number`, which is why ten of these pages
    // carried type errors and the step index never reached the accordion.
    approachSteps: {
        num: string;
        title: string;
        desc: string;
    }[];

    /** Optional human contact shown beside the form. */
    contactPhoneDisplay?: string;
    contactPhoneHref?: string;
    contactEmail?: string;

    /**
     * `editorial` is the elevated treatment for flagship services — asymmetric
     * left-aligned hero, a larger display size, more air, and a dithered brand
     * texture behind the conversion moment. Deliberately a variant rather than
     * a bespoke page, so a second or third flagship can adopt it without a
     * parallel layout to maintain.
     */
    variant?: 'standard' | 'editorial';

    // Form Section
    formTitleDark: React.ReactNode;
    formTitleAccent: React.ReactNode;
    formSubtitle: React.ReactNode;
}

export default function ServicePageLayout(props: ServicePageLayoutProps) {
    const {
        heroTitle,
        heroTagline,
        heroDescription,
        heroCtaText = "Find Your Talent",
        imageSrc = "/contingent-team.png",
        imageAlt = "TalentMesh Service Team",
        approachCategory,
        approachHeadingDark,
        approachHeadingAccent,
        approachLead,
        approachBody,
        approachSteps,
        formTitleDark,
        formTitleAccent,
        formSubtitle,
        contactPhoneDisplay,
        contactPhoneHref,
        contactEmail,
        variant = 'standard',
    } = props;

    const pathname = usePathname();

    const [openStep, setOpenStep] = useState<number | null>(0);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const toggleStep = (index: number) => {
        setOpenStep(prev => (prev === index ? null : index));
    };

    // Names the service in the notification subject, so an enquiry is
    // attributable to the page it came from without per-page configuration.
    const serviceName =
        typeof heroTitle === 'string'
            ? heroTitle
            : (pathname || '').split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Services';

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

        // Honeypot: bots fill hidden fields, people don't.
        if (data.botcheck) return;

        setStatus('submitting');
        setErrorMsg('');

        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    company: data.company,
                    phone: data.phone,
                    category: data.category,
                    message: data.message,
                    service: serviceName,
                    subject: `New ${serviceName} enquiry — ${[data.first_name, data.last_name].filter(Boolean).join(' ') || 'Website visitor'}`,
                    from_name: 'TalentMesh Website',
                    replyto: data.email,
                }),
            });
            const json = await res.json().catch(() => ({ success: res.ok }));

            if (res.ok && json.success !== false) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
                setErrorMsg(json.message || 'Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setErrorMsg('We could not reach the server. Please try again, or call us directly.');
        }
    };

    return (
        <main className={`${styles.page} ${variant === 'editorial' ? styles.editorial : ''}`}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.container}>
                    <div className={styles.textWrapper}>
                        <h1 className={styles.title}>{heroTitle}</h1>
                        <h2 className={styles.tagline}>{heroTagline}</h2>
                        <div className={styles.description}>
                            {heroDescription}
                        </div>
                        <Link href="#contact-form" className={styles.ctaBtn}>
                            {heroCtaText}
                        </Link>
                    </div>

                    <div className={styles.imageWrapper}>
                        {/* `sizes` matters here: the source PNGs are ~2MB at
                            1942px wide, and without it next/image can serve a
                            far larger variant than the 1140px container needs. */}
                        <Image
                            src={imageSrc}
                            alt={imageAlt}
                            width={1200}
                            height={480}
                            sizes="(max-width: 1200px) 100vw, 1140px"
                            priority
                            className={styles.bannerImage}
                        />
                    </div>
                </div>
            </section>

            {/* Approach Section */}
            <section className={styles.approachSection}>
                <div className={styles.approachContainer}>
                    {/* Left Column */}
                    <div className={styles.approachLeft}>
                        <span className={styles.approachCategory}>{approachCategory}</span>
                        <h2 className={styles.approachHeading}>
                            <span className={styles.headingDark}>{approachHeadingDark} </span>
                            <span className={styles.headingAccent}>{approachHeadingAccent}</span>
                        </h2>
                        {approachLead && (
                            <div className={styles.approachLead}>
                                {approachLead}
                            </div>
                        )}
                        {approachBody && (
                            <div className={styles.approachBody}>
                                {approachBody}
                            </div>
                        )}
                    </div>

                    {/* Right Column (Accordion) */}
                    <div className={styles.accordion}>
                        {approachSteps.map((step, index) => {
                            const isOpen = openStep === index;
                            return (
                                <div
                                    key={step.num || step.title}
                                    className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
                                >
                                    <button
                                        type="button"
                                        className={styles.accordionHeader}
                                        onClick={() => toggleStep(index)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className={styles.accordionHeaderLeft}>
                                            {/* These are an ordered method, not a
                                                list of FAQs — showing the index
                                                is what makes them read that way. */}
                                            <span className={styles.stepNum}>{step.num}</span>
                                            <span className={styles.accordionTitle}>{step.title}</span>
                                        </div>
                                        <span className={styles.iconCircle} aria-hidden="true">
                                            {isOpen ? '−' : '+'}
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className={styles.accordionBody}>
                                            <p>{step.desc}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Contact / Lead-Capture Form Section */}
            <section className={styles.formSection} id="contact-form">
                <div className={styles.formContainer}>
                    {/* Left Column */}
                    <div className={styles.formLeft}>
                        <h2 className={styles.formTitle}>
                            <span className={styles.headingDark}>{formTitleDark}</span><br />
                            <span className={styles.headingAccent}>{formTitleAccent}</span>
                        </h2>
                        <div className={styles.formSubtitle}>
                            {formSubtitle}
                        </div>

                        {/* A lead-capture page that only offers a form asks the
                            visitor to wait. Giving them a person to call is the
                            approachable half of "premium but approachable". */}
                        {(contactPhoneHref || contactEmail) && (
                            <div className={styles.formContact}>
                                <span className={styles.formContactLabel}>Prefer to talk?</span>
                                {contactPhoneHref && (
                                    <a href={contactPhoneHref} className={styles.formContactLink}>
                                        {contactPhoneDisplay}
                                    </a>
                                )}
                                {contactEmail && (
                                    <a href={`mailto:${contactEmail}`} className={styles.formContactLink}>
                                        {contactEmail}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column (Form) */}
                    <div className={styles.formRight}>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            {/* Honeypot — hidden from people, filled by bots. */}
                            <input
                                type="checkbox"
                                name="botcheck"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                style={{ display: 'none' }}
                            />

                            {/* Row 1: First & Last Name */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <input
                                        type="text"
                                        name="first_name"
                                        required
                                        autoComplete="given-name"
                                        aria-label="First name"
                                        className={styles.formInput}
                                        placeholder="First Name*"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <input
                                        type="text"
                                        name="last_name"
                                        autoComplete="family-name"
                                        aria-label="Last name"
                                        className={styles.formInput}
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email */}
                            <div className={styles.formGroup}>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="email"
                                    aria-label="Email address"
                                    className={styles.formInput}
                                    placeholder="Email*"
                                />
                            </div>

                            {/* Row 3: Company & Phone */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <input
                                        type="text"
                                        name="company"
                                        autoComplete="organization"
                                        aria-label="Company"
                                        className={styles.formInput}
                                        placeholder="Company"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <input
                                        type="tel"
                                        name="phone"
                                        autoComplete="tel"
                                        aria-label="Phone number"
                                        className={styles.formInput}
                                        placeholder="Phone"
                                    />
                                </div>
                            </div>

                            {/* Row 4: Choose a category */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel} htmlFor="category">Choose a category</label>
                                <div className={styles.formSelectWrap}>
                                    <select id="category" name="category" className={styles.formSelect} defaultValue="None">
                                        <option value="None">None</option>
                                        <option value="tech">Technology &amp; Engineering</option>
                                        <option value="data">Data &amp; AI Analytics</option>
                                        <option value="enterprise">Enterprise Systems (ERP/CRM)</option>
                                        <option value="ops">Operations &amp; Project Management</option>
                                        <option value="finance">Finance &amp; Professional Services</option>
                                        <option value="healthcare">Healthcare &amp; Life Sciences</option>
                                        <option value="other">Other Requirements</option>
                                    </select>
                                    <span className={styles.selectArrow}>▼</span>
                                </div>
                            </div>

                            {/* Row 5: How can we help you? */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel} htmlFor="message">How can we help you?</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    aria-label="How can we help you?"
                                    className={styles.formTextarea}
                                    placeholder="Tell us what you're hiring for*"
                                    rows={4}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={status === 'submitting'}
                            >
                                {status === 'submitting' ? 'Sending…' : 'Get started'}
                            </button>

                            {/* Status is announced, not just shown. */}
                            <div aria-live="polite">
                                {status === 'success' && (
                                    <div className={styles.formSuccess}>
                                        Thanks — we&apos;ve got your enquiry and will come back to you
                                        within one working day. Need us sooner? Call{' '}
                                        {contactPhoneDisplay || 'our team'}.
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className={styles.formError}>
                                        {errorMsg}{' '}
                                        {contactPhoneHref && (
                                            <a href={contactPhoneHref}>Call {contactPhoneDisplay} instead</a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}
