"use client";
import React, { useState, useEffect, useCallback } from 'react';
import styles from './CreateOfferModal.module.css';
import { insforge, invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

interface CreateOfferModalProps {
    applicationId: string;
    jobId: string;
    candidateId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const PERK_OPTIONS = [
    "Health Insurance", "Dental & Vision", "Stock Options / ESOP",
    "Flexible Hours", "Work From Home", "Annual Bonus",
    "Learning Budget", "Gym Membership", "Gratuity"
];

export default function CreateOfferModal({ applicationId, jobId, candidateId, onClose, onSuccess }: CreateOfferModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [salary, setSalary] = useState<number>(0);
    const [workMode, setWorkMode] = useState<'remote' | 'hybrid' | 'onsite'>('hybrid');
    const [location, setLocation] = useState('');
    const [joiningDate, setJoiningDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    const [perks, setPerks] = useState<string[]>([]);
    const [customPerk, setCustomPerk] = useState('');
    const [additionalTerms, setAdditionalTerms] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [jobRes, candRes] = await Promise.all([
                insforge.database.from('jobs').select('title, salary_min, salary_max, company_name:companies(name)').eq('id', jobId).single(),
                insforge.database.from('profiles').select('full_name, avatar_url').eq('id', candidateId).single()
            ]);

            if (jobRes.error) throw jobRes.error;
            if (candRes.error) throw candRes.error;

            setData({ job: jobRes.data, candidate: candRes.data });
            setTitle(jobRes.data.title);
        } catch (err) {
            console.error('Error fetching modal data:', err);
            toast.error('Failed to load offer data');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [jobId, candidateId, onClose]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatINR = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const handleTogglePerk = (perk: string) => {
        setPerks(prev => prev.includes(perk) ? prev.filter(p => p !== perk) : [...prev, perk]);
    };

    const addCustomPerk = () => {
        if (customPerk.trim() && !perks.includes(customPerk.trim())) {
            setPerks(prev => [...prev, customPerk.trim()]);
            setCustomPerk('');
        }
    };

    const handleSubmit = async (status: 'draft' | 'sent') => {
        if (salary <= 0) {
            toast.error('Please enter a valid salary');
            return;
        }

        setSubmitting(true);
        try {
            const offerData = {
                application_id: applicationId,
                job_id: jobId,
                candidate_id: candidateId,
                recruiter_id: user?.id,
                position_title: title,
                salary_offered: salary,
                joining_date: joiningDate,
                offer_valid_until: validUntil,
                work_mode: workMode,
                work_location: workMode === 'remote' ? 'Remote' : location,
                perks: perks,
                additional_terms: additionalTerms,
                status: status
            };

            const { error: offerErr } = await insforge.database.from('offers').insert([offerData]);
            if (offerErr) throw offerErr;

            if (status === 'sent') {
                // Update application status
                const { error: updateErr } = await invokeFunction('update-application', {
                    body: { id: applicationId, status: 'offered' }
                });
                if (updateErr) throw updateErr;
                
                toast.success('Offer letter sent to candidate!');
            } else {
                toast.success('Offer saved as draft');
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Submit offer error:', err);
            toast.error('Failed to create offer');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Create Job Offer</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.candidateSummary}>
                        <div className={styles.avatar}>
                            {data.candidate.full_name?.[0]}
                        </div>
                        <div>
                            <div className={styles.candName}>{data.candidate.full_name}</div>
                            <div className={styles.jobTitle}>Applying for {data.job.title}</div>
                        </div>
                    </div>

                    {!showPreview ? (
                        <>
                            <span className={styles.sectionTitle}>Offer Details</span>
                            <div className={styles.formGrid}>
                                <div className={`${styles.field} ${styles.fieldFull}`}>
                                    <label className={styles.label}>Position Title</label>
                                    <input 
                                        className={styles.input} 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Senior Frontend Engineer"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Offered Salary (Annual CTC)</label>
                                    <input 
                                        type="number" 
                                        className={styles.input} 
                                        value={salary || ''} 
                                        onChange={e => setSalary(Number(e.target.value))}
                                        placeholder="e.g. 1200000"
                                    />
                                    {data.job.salary_min && (
                                        <div className={styles.helper}>
                                            Market range: {formatINR(data.job.salary_min)} – {formatINR(data.job.salary_max)}
                                        </div>
                                    )}
                                    {salary > 0 && <div className={styles.salaryPreview}>{formatINR(salary)} p.a.</div>}
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Work Mode</label>
                                    <div className={styles.radioGroup}>
                                        {['remote', 'hybrid', 'onsite'].map(mode => (
                                            <div key={mode} className={styles.radioOption}>
                                                <input 
                                                    type="radio" 
                                                    id={`mode-${mode}`}
                                                    className={styles.radioInput}
                                                    checked={workMode === mode}
                                                    onChange={() => setWorkMode(mode as any)}
                                                />
                                                <label htmlFor={`mode-${mode}`} className={styles.radioLabel}>
                                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {workMode !== 'remote' && (
                                    <div className={`${styles.field} ${styles.fieldFull}`}>
                                        <label className={styles.label}>Work Location</label>
                                        <input 
                                            className={styles.input} 
                                            value={location} 
                                            onChange={e => setLocation(e.target.value)}
                                            placeholder="e.g. Bangalore, KA"
                                        />
                                    </div>
                                )}

                                <div className={styles.field}>
                                    <label className={styles.label}>Joining Date</label>
                                    <input 
                                        type="date" 
                                        className={styles.input} 
                                        value={joiningDate} 
                                        onChange={e => setJoiningDate(e.target.value)}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Offer Valid Until</label>
                                    <input 
                                        type="date" 
                                        className={styles.input} 
                                        value={validUntil} 
                                        onChange={e => setValidUntil(e.target.value)}
                                    />
                                </div>
                            </div>

                            <span className={styles.sectionTitle}>Perks & Benefits</span>
                            <div className={styles.perksList}>
                                {PERK_OPTIONS.map(perk => (
                                    <label key={perk} className={styles.checkboxLabel}>
                                        <input 
                                            type="checkbox" 
                                            checked={perks.includes(perk)} 
                                            onChange={() => handleTogglePerk(perk)}
                                        />
                                        {perk}
                                    </label>
                                ))}
                            </div>
                            <div className={styles.addCustom}>
                                <input 
                                    className={styles.input} 
                                    placeholder="Add custom perk..." 
                                    value={customPerk}
                                    onChange={e => setCustomPerk(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addCustomPerk()}
                                />
                                <button className={styles.btnSecondary} onClick={addCustomPerk}>Add</button>
                            </div>
                            <div className={styles.perkTags}>
                                {perks.map(p => (
                                    <span key={p} className={styles.perkTag}>
                                        {p}
                                        <button className={styles.removePerk} onClick={() => handleTogglePerk(p)}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <span className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Additional Terms</span>
                            <textarea 
                                className={styles.textarea} 
                                rows={3}
                                maxLength={500}
                                placeholder="Any specific terms, probation period, notice period requirements..."
                                value={additionalTerms}
                                onChange={e => setAdditionalTerms(e.target.value)}
                            />
                        </>
                    ) : (
                        <div className={styles.letterWrap}>
                            <div className={styles.letter}>
                                <h1>LETTER OF INTENT</h1>
                                <p style={{ textAlign: 'right' }}>Date: {format(new Date(), 'MMMM dd, yyyy')}</p>
                                
                                <p>Dear {data.candidate.full_name},</p>
                                
                                <p>We are pleased to offer you the position of <strong>{title}</strong> at <strong>{data.job.company_name?.name || 'TalentMesh'}</strong>. Your skills and experience will be a great addition to our team.</p>

                                <div className={styles.letterSection}>
                                    <h3>Compensation</h3>
                                    <p>Annual CTC: <strong>{formatINR(salary)}</strong> per annum</p>
                                </div>

                                <div className={styles.letterSection}>
                                    <h3>Details</h3>
                                    <p>Work Mode: {workMode.charAt(0).toUpperCase() + workMode.slice(1)} {location && `(${location})`}</p>
                                    <p>Expected Start Date: {format(new Date(joiningDate), 'MMMM dd, yyyy')}</p>
                                </div>

                                {perks.length > 0 && (
                                    <div className={styles.letterSection}>
                                        <h3>Benefits</h3>
                                        <ul>
                                            {perks.map(p => <li key={p}>{p}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {additionalTerms && (
                                    <div className={styles.letterSection}>
                                        <h3>Terms & Conditions</h3>
                                        <p>{additionalTerms}</p>
                                    </div>
                                )}

                                <p>This offer is valid until <strong>{format(new Date(validUntil), 'MMMM dd, yyyy')}</strong>.</p>
                                
                                <p style={{ marginTop: '3rem' }}>Sincerely,</p>
                                <p><strong>Hiring Team</strong></p>
                            </div>
                        </div>
                    )}

                    <button className={styles.previewToggle} onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? '← Back to Editor' : '👁 Preview Offer Letter'}
                    </button>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
                    <button 
                        className={styles.btnSecondary} 
                        disabled={submitting}
                        onClick={() => handleSubmit('draft')}
                    >
                        Save as Draft
                    </button>
                    <button 
                        className={styles.btnPrimary} 
                        disabled={submitting}
                        onClick={() => handleSubmit('sent')}
                    >
                        {submitting ? 'Sending...' : 'Send Offer to Candidate'}
                    </button>
                </div>
            </div>
        </div>
    );
}
