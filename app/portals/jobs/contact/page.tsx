'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Briefcase, Check, LoaderCircle, Mail, MapPin, MessageCircle, Phone, Plus, UserRound } from 'lucide-react';
import { CONTACT, STRONG_CTA } from '@/content/home';
import { CONTACT_FAQS } from './faqs';
import styles from './contact.module.css';

const EMPTY_FORM = { fullName: '', email: '', phone: '', organization: '', userType: 'employer', message: '' };
// The first two are the main routes into the form and render as large cards.
const PRIMARY_PURPOSES = [
    { value: 'employer', label: 'I’m hiring', note: 'Find talent for your team', Icon: Briefcase },
    { value: 'candidate', label: 'I’m looking for work', note: 'Explore your next role', Icon: UserRound },
];
const OTHER_PURPOSES = [
    { value: 'partner', label: 'Partnerships' },
    { value: 'other', label: 'Something else' },
];
const MESSAGE_HINTS: Record<string, string> = {
    employer: 'Tell us about the roles, location and hiring timeline you have in mind.',
    candidate: 'Tell us about your experience, the roles you’re looking for and your preferred location.',
    partner: 'Tell us about your organization and how you’d like to work together.',
    other: 'Tell us what you’d like to discuss with our team.',
};

const MAPS_QUERY = `${CONTACT.streetAddress}, ${CONTACT.locality} ${CONTACT.postalCode}, ${CONTACT.region}, India`;
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(MAPS_QUERY)}&output=embed`;
const PHONE_ERROR = 'Enter a 10-digit Indian mobile number (starting with 6–9), or an international number starting with + and the country code.';

/** Optional field: empty is valid. Indian mobile with optional +91 / 91 / 0, or any other +<country code> number of 8–15 digits. */
function isValidPhone(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (!/^\+?[\d\s-]+$/.test(trimmed)) return false;
    const compact = trimmed.replace(/[\s-]/g, '');
    if (/^(?:\+91|91|0)?[6-9]\d{9}$/.test(compact)) return true;
    return /^\+(?!91)\d{8,15}$/.test(compact);
}

export default function ContactPage() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [phoneError, setPhoneError] = useState('');
    const submitting = useRef(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const restoreFormFocus = useRef(false);
    useEffect(() => {
        if (!sent && restoreFormFocus.current) {
            formRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
            restoreFormFocus.current = false;
        }
    }, [sent]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(previous => ({ ...previous, [name]: value }));
        if (name === 'phone' && phoneError && isValidPhone(value)) setPhoneError('');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting.current) return;
        if (!isValidPhone(formData.phone)) {
            setPhoneError(PHONE_ERROR);
            formRef.current?.querySelector<HTMLInputElement>('#contact-phone')?.focus();
            return;
        }
        submitting.current = true;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    organization: formData.organization,
                    userType: formData.userType,
                    message: formData.message,
                    subject: `New Contact Form Submission from ${formData.fullName}`,
                    from_name: 'Talentmesh Contact Form',
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error('Submission failed');
            setSent(true);
            requestAnimationFrame(() => resultRef.current?.focus());
        } catch {
            setError('Your message couldn’t be sent. Please try again, or email us at info@talentmeshsolutions.com. Your details are still here.');
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    return (
        <main className={styles.page}>
            <div className={styles.layout}>
                <div className={styles.panel}>
                    <header className={styles.intro}>
                        <h1>Let’s talk about<br />your <span>next hire.</span></h1>
                        <p>Building a team or looking for your next role? Tell us what you have in mind. We’ll take it from there.</p>
                    </header>

                    <aside className={styles.details} aria-labelledby="details-title">
                        <h2 id="details-title">A direct line to our team.</h2>
                        <ul className={styles.methods}>
                            <li>
                                <a className={styles.method} href={STRONG_CTA.emailHref}>
                                    <span className={styles.methodIcon}><Mail size={20} aria-hidden="true" /></span>
                                    <span className={styles.methodText}><span>Email us</span><strong>{CONTACT.email}</strong></span>
                                    <ArrowUpRight size={18} aria-hidden="true" />
                                </a>
                            </li>
                            <li>
                                <a className={styles.method} href={STRONG_CTA.phoneHref}>
                                    <span className={styles.methodIcon}><Phone size={20} aria-hidden="true" /></span>
                                    <span className={styles.methodText}><span>Call us</span><strong>{STRONG_CTA.phoneDisplay}</strong></span>
                                    <ArrowUpRight size={18} aria-hidden="true" />
                                </a>
                            </li>
                            <li>
                                <a className={styles.method} href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer">
                                    <span className={styles.methodIcon}><MessageCircle size={20} aria-hidden="true" /></span>
                                    <span className={styles.methodText}><span>WhatsApp</span><strong>Chat with our team</strong></span>
                                    <ArrowUpRight size={18} aria-hidden="true" />
                                </a>
                            </li>
                        </ul>
                        <div className={styles.panelOffice}>
                            <MapPin size={20} aria-hidden="true" />
                            <div>
                                <span>Our office</span>
                                <address>{CONTACT.addressLines.map(line => <span key={line}>{line}</span>)}</address>
                            </div>
                        </div>
                    </aside>
                </div>

                <section id="contact-form" className={styles.formPanel} aria-labelledby="form-title">
                    {sent ? (
                        <div className={styles.success} ref={resultRef} tabIndex={-1}>
                            <Check size={36} aria-hidden="true" />
                            <h2 id="form-title">Thanks for reaching out.</h2>
                            <p>Your message has been sent to Talentmesh Solutions. Our team will get in touch using the details you shared.</p>
                            <button className={styles.submit} onClick={() => { restoreFormFocus.current = true; setFormData(EMPTY_FORM); setSent(false); }}>Send another message <ArrowRight size={18} aria-hidden="true" /></button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formHeading}>
                                <h2 id="form-title">How can we help?</h2>
                                <p>Share a few details to start the conversation.</p>
                            </div>
                            <form ref={formRef} className={styles.form} onSubmit={handleSubmit} aria-busy={loading}>
                                <fieldset className={styles.purpose} disabled={loading}>
                                    <legend>What brings you here?</legend>
                                    <div className={styles.routes}>
                                        {PRIMARY_PURPOSES.map(({ value, label, note, Icon }) => (
                                            <label key={value} className={styles.route}>
                                                <input type="radio" name="userType" value={value} checked={formData.userType === value} onChange={handleChange} />
                                                <span className={styles.routeIcon}><Icon size={20} aria-hidden="true" /></span>
                                                <span className={styles.routeText}><strong>{label}</strong><span>{note}</span></span>
                                                <Check className={styles.routeCheck} size={16} aria-hidden="true" />
                                            </label>
                                        ))}
                                    </div>
                                    <div className={styles.otherPurposes}>
                                        {OTHER_PURPOSES.map(purpose => (
                                            <label key={purpose.value} className={styles.purposeOption}>
                                                <input type="radio" name="userType" value={purpose.value} checked={formData.userType === purpose.value} onChange={handleChange} />
                                                <span>{purpose.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <div className={styles.formRow}>
                                    <div className={styles.field}>
                                        <label htmlFor="contact-name">Full name</label>
                                        <input id="contact-name" name="fullName" autoComplete="name" required value={formData.fullName} onChange={handleChange} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="contact-email">Email address</label>
                                        <input id="contact-email" type="email" name="email" autoComplete="email" required value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.field}>
                                        <label htmlFor="contact-phone">Phone <span>(optional)</span></label>
                                        <input
                                            id="contact-phone"
                                            type="tel"
                                            name="phone"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            aria-invalid={phoneError ? true : undefined}
                                            aria-describedby={phoneError ? 'phone-error' : 'phone-hint'}
                                            value={formData.phone}
                                            onChange={handleChange}
                                            onBlur={() => setPhoneError(isValidPhone(formData.phone) ? '' : PHONE_ERROR)}
                                        />
                                        {phoneError
                                            ? <p id="phone-error" role="alert" className={styles.fieldError}>{phoneError}</p>
                                            : <p id="phone-hint" className={styles.phoneHint}>Share your number if you’d prefer a call.</p>}
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="contact-company">Company {formData.userType !== 'employer' && <span>(optional)</span>}</label>
                                        <input id="contact-company" name="organization" autoComplete="organization" required={formData.userType === 'employer'} value={formData.organization} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="contact-message">What would you like to discuss?</label>
                                    <p id="message-hint" className={styles.hint}>{MESSAGE_HINTS[formData.userType]}</p>
                                    <textarea id="contact-message" name="message" rows={4} required aria-describedby="message-hint" value={formData.message} onChange={handleChange} />
                                </div>
                                {error && <p role="alert" className={styles.error}>{error}</p>}
                                <div className={styles.formBottom}>
                                    <button type="submit" className={styles.submit} disabled={loading}>{loading ? 'Sending…' : 'Send message'}{loading ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
                                    <span>Prefer to talk?<br /><a href="tel:+919898161106">Call our team</a></span>
                                </div>
                                <span className={styles.status} role="status">{loading ? 'Sending your message. Please wait.' : ''}</span>
                            </form>
                        </>
                    )}
                </section>
            </div>

            <section className={styles.section} aria-labelledby="office-title">
                <div className={styles.mapCard}>
                    <div className={styles.mapFrame}>
                        <iframe
                            src={MAP_EMBED_SRC}
                            title="Map showing the Talentmesh Solutions office in Navrangpura, Ahmedabad"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                    <div className={styles.office}>
                        <div className={styles.officePhoto}>
                            <Image
                                src="/images/about/contact-reception.webp"
                                alt="Reception and waiting area of a bright modern office"
                                fill
                                sizes="(max-width: 900px) 100vw, 480px"
                            />
                        </div>
                        <p className={styles.eyebrow}>Visit us</p>
                        <h2 id="office-title">Based in Ahmedabad. <span>Hiring across India.</span></h2>
                        <address>{CONTACT.addressLines.map(line => <span key={line}>{line}</span>)}</address>
                        <a href="https://www.google.com/maps/search/?api=1&query=7-B%20Amrut%20Bag%20Colony%20Navrangpura%20Ahmedabad%20380009" target="_blank" rel="noopener noreferrer">View on Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a>
                    </div>
                </div>
            </section>

            <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title">
                <div className={styles.faqHead}>
                    <p className={styles.eyebrow}>FAQ</p>
                    <h2 id="faq-title">Before you <span>get in touch.</span></h2>
                </div>
                <div className={styles.faqList}>
                    {CONTACT_FAQS.map(faq => (
                        <details key={faq.question} className={styles.faqItem}>
                            <summary>{faq.question}<Plus size={20} aria-hidden="true" /></summary>
                            <p>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>
        </main>
    );
}
