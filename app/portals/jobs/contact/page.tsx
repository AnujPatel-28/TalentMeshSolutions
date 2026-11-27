'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, LoaderCircle, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { MotionAccordion } from '@/components/ui/MotionAccordion';
import { CONTACT, STRONG_CTA } from '@/content/home';
import { CONTACT_FAQS } from './faqs';
import styles from './contact.module.css';

const LOGO_T_PATH = 'M3,178 L0,185 L0,208 L109,158 L110,270 L114,280 L119,286 L131,292 L188,292 L188,263 L140,262 L140,110 L22,164 L9,171 Z M259,1 L258,0 L141,54 L140,7 L131,8 L120,13 L113,21 L110,29 L110,100 L245,40 L254,32 L259,18 Z';
const SERVICES = [
    'Hiring for my team',
    'Looking for a job',
    'Contract & temp staffing',
    'Recruitment outsourcing (RPO)',
    'Executive search',
    'Something else',
];
// India first; the rest cover where most international enquiries come from.
const COUNTRY_CODES = [
    { code: '+91', label: 'IN +91' },
    { code: '+971', label: 'AE +971' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+65', label: 'SG +65' },
    { code: '+61', label: 'AU +61' },
];
const EMPTY_FORM = { firstName: '', lastName: '', email: '', countryCode: '+91', phone: '', organization: '', message: '', services: [] as string[] };

// Pin the embed to the office's coordinates; a text search can land on the wrong building.
const MAP_PIN = `${CONTACT.geo.latitude},${CONTACT.geo.longitude}`;
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${MAP_PIN}&z=17&output=embed`;
// On wide screens the office card covers the map's left side, so centre the map west of
// the pin (ll) to put the pin in the open part on the right.
const MAP_EMBED_SRC_WIDE = `https://www.google.com/maps?q=${MAP_PIN}&ll=${CONTACT.geo.latitude},${(CONTACT.geo.longitude - 0.0032).toFixed(7)}&z=17&output=embed`;
const PHONE_ERROR = 'Enter a valid number for the selected country. Indian mobile numbers have 10 digits and start with 6–9.';

/** The number as sent: empty, or the country code plus the national number without its leading zeros. */
function fullPhone(countryCode: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) return trimmed;
    return `${countryCode}${trimmed.replace(/[\s-]/g, '').replace(/^0+/, '')}`;
}

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
    const [addressCopied, setAddressCopied] = useState(false);
    const submitting = useRef(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const restoreFormFocus = useRef(false);
    useEffect(() => {
        if (!sent && restoreFormFocus.current) {
            formRef.current?.querySelector<HTMLInputElement>('#contact-first-name')?.focus();
            restoreFormFocus.current = false;
        }
    }, [sent]);

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(CONTACT.addressLines.join(' '));
            setAddressCopied(true);
            window.setTimeout(() => setAddressCopied(false), 2500);
        } catch {
            // Clipboard blocked (e.g. insecure context): open the map, which shows the address.
            window.open(CONTACT.mapsHref, '_blank', 'noopener,noreferrer');
        }
    };

    const phoneIsValid = (countryCode: string, phone: string) => isValidPhone(fullPhone(countryCode, phone));

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        const next = { ...formData, [name]: value };
        setFormData(next);
        if ((name === 'phone' || name === 'countryCode') && phoneError && phoneIsValid(next.countryCode, next.phone)) setPhoneError('');
    };

    const toggleService = (service: string) => {
        setFormData(previous => ({
            ...previous,
            services: previous.services.includes(service)
                ? previous.services.filter(item => item !== service)
                : [...previous.services, service],
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting.current) return;
        if (!phoneIsValid(formData.countryCode, formData.phone)) {
            setPhoneError(PHONE_ERROR);
            formRef.current?.querySelector<HTMLInputElement>('#contact-phone')?.focus();
            return;
        }
        submitting.current = true;
        setLoading(true);
        setError('');
        const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    name,
                    email: formData.email,
                    phone: fullPhone(formData.countryCode, formData.phone),
                    organization: formData.organization,
                    services: formData.services.length ? formData.services.join(', ') : 'Not specified',
                    message: formData.message,
                    subject: `New Contact Form Submission from ${name}`,
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
            <div className={styles.sky} aria-hidden="true" />
            {/* data-nav-theme: the navbar turns transparent with the white logo while it sits over the blue sky. */}
            <header className={styles.intro} data-nav-theme="dark">
                {/* The inline logo glyph splits the computed name into "T eam", so name the heading outright. */}
                <h1 aria-label="Contact our Team">
                    Contact our{' '}
                    <span className={styles.team}>
                        <span className={styles.hiddenLetter}>T</span>
                        {/* The "t" from the Talentmesh logo, traced from talentmesh-solutions-logo-transparent.png. */}
                        <svg className={styles.logoT} viewBox="0 0 260 293" aria-hidden="true" focusable="false">
                            <path fill="currentColor" d={LOGO_T_PATH} />
                        </svg>
                        eam
                    </span>
                </h1>
                <p>Hiring for your team or looking for your next role? Tell us what you have in mind and our team in Ahmedabad will take it from there.</p>
            </header>

            <div className={styles.card}>
                <section id="contact-form" className={styles.formPanel} aria-labelledby="form-title">
                    {sent ? (
                        <div className={styles.success} ref={resultRef} tabIndex={-1}>
                            <Check size={36} aria-hidden="true" />
                            <h2 id="form-title">Thanks for reaching out.</h2>
                            <p>Your message has been sent to Talentmesh Solutions. Our team will get in touch using the details you shared.</p>
                            <button className={styles.submit} onClick={() => { restoreFormFocus.current = true; setFormData(EMPTY_FORM); setSent(false); }}>Send another message <ArrowRight size={18} aria-hidden="true" /></button>
                        </div>
                    ) : (
                        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} aria-busy={loading}>
                            <h2 id="form-title" className={styles.visuallyHidden}>Send us a message</h2>
                            <div className={styles.formRow}>
                                <div className={styles.field}>
                                    <label htmlFor="contact-first-name">First name</label>
                                    <input id="contact-first-name" name="firstName" autoComplete="given-name" placeholder="First name" required value={formData.firstName} onChange={handleChange} />
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="contact-last-name">Last name</label>
                                    <input id="contact-last-name" name="lastName" autoComplete="family-name" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="contact-email">Email</label>
                                <input id="contact-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="contact-phone">Phone number <span>(optional)</span></label>
                                <div className={styles.phone} data-invalid={phoneError ? true : undefined}>
                                    <span className={styles.countrySelect}>
                                        <select name="countryCode" aria-label="Country code" value={formData.countryCode} onChange={handleChange}>
                                            {COUNTRY_CODES.map(country => <option key={country.label} value={country.code}>{country.label}</option>)}
                                        </select>
                                    </span>
                                    <input
                                        id="contact-phone"
                                        type="tel"
                                        name="phone"
                                        inputMode="tel"
                                        autoComplete="tel-national"
                                        placeholder="98981 61106"
                                        aria-invalid={phoneError ? true : undefined}
                                        aria-describedby={phoneError ? 'phone-error' : undefined}
                                        value={formData.phone}
                                        onChange={handleChange}
                                        onBlur={() => setPhoneError(phoneIsValid(formData.countryCode, formData.phone) ? '' : PHONE_ERROR)}
                                    />
                                </div>
                                {phoneError && <p id="phone-error" role="alert" className={styles.fieldError}>{phoneError}</p>}
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="contact-company">Company <span>(optional)</span></label>
                                <input id="contact-company" name="organization" autoComplete="organization" placeholder="Company name" value={formData.organization} onChange={handleChange} />
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="contact-message">Message</label>
                                <textarea id="contact-message" name="message" rows={4} required placeholder="Tell us about the roles, location and timeline you have in mind…" value={formData.message} onChange={handleChange} />
                            </div>
                            <fieldset className={styles.services} disabled={loading}>
                                <legend>How can we help?</legend>
                                <div className={styles.serviceGrid}>
                                    {SERVICES.map(service => (
                                        <label key={service} className={styles.service}>
                                            <input type="checkbox" checked={formData.services.includes(service)} onChange={() => toggleService(service)} />
                                            <span>{service}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            {error && <p role="alert" className={styles.error}>{error}</p>}
                            <button type="submit" className={styles.submit} disabled={loading}>{loading ? 'Sending…' : 'Send message'}{loading ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
                            <span className={styles.status} role="status">{loading ? 'Sending your message. Please wait.' : ''}</span>
                        </form>
                    )}
                </section>

                <aside className={styles.routes} aria-label="Other ways to reach us">
                    <section>
                        <h2>Chat with us</h2>
                        <p>Talk to our team on WhatsApp or by email.</p>
                        <a className={styles.route} href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" />Chat on WhatsApp</a>
                        <a className={styles.route} href={STRONG_CTA.emailHref}><Mail size={18} aria-hidden="true" />{CONTACT.email}</a>
                    </section>
                    <section>
                        <h2>Call us</h2>
                        <p>Prefer to talk? Call our team directly.</p>
                        <a className={styles.route} href={STRONG_CTA.phoneHref}><Phone size={18} aria-hidden="true" />{STRONG_CTA.phoneDisplay}</a>
                    </section>
                    <section>
                        <h2>Visit us</h2>
                        <p>Meet us in person at our office in Gota.</p>
                        <a className={`${styles.route} ${styles.routeAddress}`} href={CONTACT.mapsHref} target="_blank" rel="noopener noreferrer"><MapPin size={18} aria-hidden="true" /><span>1203, Ganesh Glory, Gota, Ahmedabad – 382470</span></a>
                    </section>
                </aside>
            </div>

            <section className={styles.section} aria-labelledby="office-title">
                <div className={styles.mapCard}>
                    {/* CSS shows one of the two; a lazy iframe that is display:none never loads. */}
                    <div className={styles.mapFrame}>
                        <iframe
                            className={styles.mapWide}
                            src={MAP_EMBED_SRC_WIDE}
                            title="Map showing the Talentmesh Solutions office at Ganesh Glory, Gota, Ahmedabad"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                        <iframe
                            className={styles.mapNarrow}
                            src={MAP_EMBED_SRC}
                            title="Map showing the Talentmesh Solutions office at Ganesh Glory, Gota, Ahmedabad"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                    <div className={styles.officeCard}>
                        <p className={styles.officeLabel}>Visit us</p>
                        <h2 id="office-title">Based in Ahmedabad. <span>Hiring across India.</span></h2>
                        <div className={styles.officeAddress}>
                            <MapPin size={20} aria-hidden="true" />
                            <address>{CONTACT.addressLines.map(line => <span key={line}>{line}</span>)}</address>
                        </div>
                        <p className={styles.officeHint}>On Jagatpur Road, just off S.G. Highway.</p>
                        <div className={styles.officeActions}>
                            <a className={styles.directions} href={CONTACT.directionsHref} target="_blank" rel="noopener noreferrer">Get directions <Navigation size={16} aria-hidden="true" /></a>
                            <button type="button" className={styles.copyAddress} onClick={copyAddress}>
                                {addressCopied ? 'Address copied' : 'Copy address'}
                                {addressCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                            </button>
                        </div>
                        <span className={styles.status} role="status">{addressCopied ? 'Address copied to the clipboard.' : ''}</span>
                    </div>
                    <a className={styles.openMaps} href={CONTACT.mapsHref} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowUpRight size={14} aria-hidden="true" /></a>
                </div>
            </section>

            {/* Same layout and accordion as the home page FAQ (components/home/HomeFAQ.tsx). */}
            <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title">
                <div className={styles.faqLeftCol}>
                    <h2 id="faq-title" className={styles.faqHeading}>
                        Recruitment &amp; <br className={styles.faqBr} />hiring FAQs
                    </h2>
                    <p className={styles.faqSubtext}>Quick answers for employers and job seekers across India.</p>
                </div>
                <div className={styles.faqRightCol}>
                    <MotionAccordion
                        variant="modern"
                        defaultOpenIndex={0}
                        itemClassName={styles.faqItem}
                        items={CONTACT_FAQS.map(faq => ({ question: faq.question, answer: faq.answer }))}
                    />
                </div>
            </section>
        </main>
    );
}
