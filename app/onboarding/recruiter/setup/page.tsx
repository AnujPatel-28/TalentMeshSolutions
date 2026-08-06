"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { CustomSelect } from '@/components/ui';
import { requestAccessSchema } from '@/lib/validation/company';
import type { z } from 'zod';
import styles from '../../onboarding.module.css';

const INDUSTRIES = [
    'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education',
    'Manufacturing', 'Real Estate', 'Logistics', 'Marketing', 'Other'
].map(i => ({ label: i, value: i }));

const DIAL_COUNTRIES = [
    { code: 'IN', dialCode: '+91', label: 'India (+91)' },
    { code: 'US', dialCode: '+1', label: 'United States (+1)' },
    { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
    { code: 'CA', dialCode: '+1', label: 'Canada (+1)' },
    { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
    { code: 'SG', dialCode: '+65', label: 'Singapore (+65)' },
    { code: 'AE', dialCode: '+971', label: 'UAE (+971)' },
];

const flattenZodErrors = (error: z.ZodError) => {
    const errors: Record<string, string> = {};
    error.issues.forEach((issue) => {
        const path = issue.path[0]?.toString();
        if (path && !errors[path]) errors[path] = issue.message;
    });
    return errors;
};

export default function RecruiterSetup() {
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        website: '',
        gstin: '',
        cin: '',
        description: '',
        phoneNumber: '',
    });
    const [dialCode, setDialCode] = useState('IN');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [companyExists, setCompanyExists] = useState<{ company_id: string; message: string } | null>(null);
    const [successData, setSuccessData] = useState<{ requestId: string | null; verificationEmail: string; companyName: string } | null>(null);
    const router = useRouter();

    const { user, isLoading: authLoading } = useAuth();

    React.useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login?redirect=/onboarding/recruiter/setup');
            return;
        }
        if (user.role === 'admin' || user.role === 'super_admin') {
            window.location.replace('/dashboard/admin');
            return;
        }
        // candidate and recruiter roles both reach this page: a fresh signup lands here with
        // role='candidate' (bumped to 'recruiter' only after this form submits, doc 20 §0.2), and
        // POST /api/recruiter/request-access already allows both — the layout guard, not this
        // page, is what routes an already-active recruiter away from here.
    }, [user, authLoading, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const selectedDial = DIAL_COUNTRIES.find(c => c.code === dialCode) || DIAL_COUNTRIES[0];

    const buildPayload = (attachCompanyId?: string) => {
        const payload: Record<string, unknown> = {
            name: formData.name,
            industry: formData.industry,
            country_code: selectedDial.code,
            phone: `${selectedDial.dialCode}${formData.phoneNumber.replace(/\D/g, '')}`,
        };
        if (formData.website) payload.website = formData.website;
        if (formData.gstin) payload.gstin = formData.gstin.toUpperCase();
        if (formData.cin) payload.cin = formData.cin.toUpperCase();
        if (formData.description) payload.description = formData.description;
        if (attachCompanyId) payload.attach_company_id = attachCompanyId;
        return payload;
    };

    const submitRequest = async (payload: Record<string, unknown>) => {
        const res = await fetch('/api/recruiter/request-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 200) {
            setCompanyExists(null);
            if (data.request_id) {
                setSuccessData({ requestId: data.request_id, verificationEmail: data.verificationEmail, companyName: formData.name });
            } else {
                router.replace('/pending-approval');
            }
            return;
        }
        if (res.status === 409) {
            setCompanyExists({ company_id: data.company_id, message: data.message || 'A company with this GSTIN is already registered.' });
            return;
        }
        if (res.status === 403) {
            router.replace('/pending-approval');
            return;
        }
        setError(data.error || 'Failed to submit your request. Please try again.');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        const payload = buildPayload();
        const validation = requestAccessSchema.safeParse(payload);
        if (!validation.success) {
            setFieldErrors(flattenZodErrors(validation.error));
            return;
        }

        setIsLoading(true);
        try {
            await submitRequest(validation.data);
        } catch (err: any) {
            setError(err.message || 'Failed to submit your request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAttachInstead = async () => {
        if (!companyExists) return;
        setError('');
        setIsLoading(true);
        try {
            await submitRequest(buildPayload(companyExists.company_id));
        } catch (err: any) {
            setError(err.message || 'Failed to submit your request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (successData) {
        const shortId = (successData.requestId || '').slice(0, 8).toUpperCase();
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
                <div className={styles.header}>
                    <h1 className={styles.title}>Registration received — one step left</h1>
                    <p className={styles.subtitle}>Your request ID: <strong>TM-{shortId}</strong></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 0.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                        Email your business documents to <strong>{successData.verificationEmail}</strong> from{' '}
                        <strong>{user?.email}</strong>, with the request ID in the subject line.
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                        Subject: Verification — TM-{shortId} — {successData.companyName}
                    </p>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Please attach:
                        <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
                            <li>Certificate of Incorporation, or GST registration certificate</li>
                            <li>One photo ID of the authorised signatory</li>
                            <li>(If applicable) Board resolution or authorisation letter</li>
                        </ul>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                        Our team reviews requests within 2 working days. You will receive an email when your
                        company is verified, and this page will update automatically.
                    </p>
                    <button className={styles.nextBtn} onClick={() => router.replace('/pending-approval')}>
                        Continue
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            <div className={styles.stepper}>
                <span className={`${styles.stepDot} ${styles.stepDotActive}`}>0</span>
                <span className={styles.stepLine} />
                <span className={styles.stepDot}>1</span>
                <span className={styles.stepLine} />
                <span className={styles.stepDot}>2</span>
                <span className={styles.stepLine} />
                <span className={styles.stepDot}>3</span>
            </div>

            <div className={styles.header}>
                <h1 className={styles.title}>Tell us about your company</h1>
                <p className={styles.subtitle}>We'll use this to verify your business and set up your recruiter account</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && <div className={styles.errorBanner}>{error}</div>}

                {companyExists && (
                    <div className={styles.errorBanner} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <span>{companyExists.message}</span>
                        <button type="button" className={styles.nextBtn} disabled={isLoading} onClick={handleAttachInstead} style={{ width: 'fit-content' }}>
                            {isLoading ? 'Requesting...' : 'Request to join instead'}
                        </button>
                    </div>
                )}

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Company name</label>
                    <input name="name" type="text" className={styles.input} placeholder="e.g. Acme Corp"
                        value={formData.name} onChange={handleChange} required />
                    {fieldErrors.name && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.name}</span>}
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Industry</label>
                    <CustomSelect name="industry" className={styles.input} value={formData.industry}
                        onChange={(e: any) => handleChange(e)} placeholder="Select Industry" options={INDUSTRIES} required />
                    {fieldErrors.industry && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.industry}</span>}
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Company website</label>
                    <input name="website" type="url" className={styles.input} placeholder="https://acme.com"
                        value={formData.website} onChange={handleChange} />
                    {fieldErrors.website && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.website}</span>}
                </div>

                <div className={styles.salaryGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>GSTIN (optional)</label>
                        <input name="gstin" type="text" className={styles.input} placeholder="22AAAAA0000A1Z5" maxLength={15}
                            value={formData.gstin} onChange={handleChange} style={{ textTransform: 'uppercase' }} />
                        {fieldErrors.gstin && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.gstin}</span>}
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>CIN (optional)</label>
                        <input name="cin" type="text" className={styles.input} placeholder="U12345MH2020PTC123456" maxLength={21}
                            value={formData.cin} onChange={handleChange} style={{ textTransform: 'uppercase' }} />
                        {fieldErrors.cin && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.cin}</span>}
                    </div>
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Contact phone</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <CustomSelect name="dialCode" className={styles.input} value={dialCode}
                            onChange={(e: any) => setDialCode(e.target.value)} options={DIAL_COUNTRIES.map(c => ({ label: c.label, value: c.code }))}
                            required />
                        <input name="phoneNumber" type="tel" className={styles.input} placeholder="98765 43210"
                            value={formData.phoneNumber} onChange={handleChange} required style={{ flex: 1 }} />
                    </div>
                    {fieldErrors.phone && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.phone}</span>}
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Description (optional)</label>
                    <textarea name="description" rows={3} className={styles.input} placeholder="What does your company do?"
                        value={formData.description} onChange={handleChange} />
                    {fieldErrors.description && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{fieldErrors.description}</span>}
                </div>

                <div className={styles.actions} style={{ marginTop: '0.5rem' }}>
                    <button className={styles.nextBtn} disabled={isLoading} style={{ width: '100%', justifyContent: 'center' }}>
                        {isLoading ? 'Submitting...' : 'Submit for Verification'}
                        {!isLoading && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
