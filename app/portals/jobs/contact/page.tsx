'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import { CONTACT } from '@/content/home';
import styles from './contact.module.css';

const EMPTY_FORM = { fullName: '', email: '', phone: '', organization: '', userType: 'employer', message: '' };
const PURPOSES = [
    { value: 'employer', label: 'Hiring talent' },
    { value: 'candidate', label: 'Looking for work' },
    { value: 'partner', label: 'Partnerships' },
    { value: 'other', label: 'Something else' },
];
const MESSAGE_HINTS: Record<string, string> = {
    employer: 'Tell us about the roles, location and hiring timeline you have in mind.',
    candidate: 'Tell us about your experience, the roles you’re looking for and your preferred location.',
    partner: 'Tell us about your organization and how you’d like to work together.',
    other: 'Tell us what you’d like to discuss with our team.',
};

export default function ContactPage() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);
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
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting.current) return;
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
                    from_name: 'TalentMesh Contact Form',
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
                <header className={styles.intro}>
                    <h1>Let’s talk about<br />your <span>next hire.</span></h1>
                    <p>Building a team or looking for your next role? Tell us what you have in mind. We’ll take it from there.</p>
                </header>

                <section id="contact-form" className={styles.formPanel} aria-labelledby="form-title">
                    {sent ? (
                        <div className={styles.success} ref={resultRef} tabIndex={-1}>
                            <Check size={36} aria-hidden="true" />
                            <h2 id="form-title">Thanks for reaching out.</h2>
                            <p>Your message has been sent to TalentMesh Solutions. Our team will get in touch using the details you shared.</p>
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
                                    <legend>I’m interested in</legend>
                                    <div className={styles.purposeOptions}>
                                        {PURPOSES.map(purpose => (
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
                                        <input id="contact-phone" type="tel" name="phone" autoComplete="tel" aria-describedby="phone-hint" value={formData.phone} onChange={handleChange} />
                                        <p id="phone-hint" className={styles.phoneHint}>Share your number if you’d prefer a call.</p>
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

                <aside className={styles.details} aria-label="Contact TalentMesh Solutions">
                    <h2>A direct line to our team.</h2>
                    <div className={styles.contactItem}>
                        <span>Email us</span>
                        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}<ArrowUpRight size={18} aria-hidden="true" /></a>
                    </div>
                    <div className={styles.contactItem}>
                        <span>Call us</span>
                        <a href="tel:+919898161106">+91 98981 61106<ArrowUpRight size={18} aria-hidden="true" /></a>
                    </div>
                    <div className={styles.office}>
                        <h3>Based in Ahmedabad.<br />Hiring across India.</h3>
                        <address>{CONTACT.addressLines.map(line => <span key={line}>{line}</span>)}</address>
                        <a href="https://www.google.com/maps/search/?api=1&query=7-B%20Amrut%20Bag%20Colony%20Navrangpura%20Ahmedabad%20380009" target="_blank" rel="noopener noreferrer">View on Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a>
                    </div>
                </aside>
            </div>
        </main>
    );
}

