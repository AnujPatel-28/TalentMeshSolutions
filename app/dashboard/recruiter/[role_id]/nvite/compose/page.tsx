"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import styles from './compose.module.css';
import { insforge, invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { ComposeFormData } from '@/types/recruiter';
import { toast } from 'react-hot-toast';
import { CustomSelect } from '@/components/ui/CustomSelect';

const IC = {
    sparkles: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M21 17v4" /><path d="M19 19h4" /></svg>,
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
};

function ComposeContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const roleId = params.role_id as string;
    
    const [formData, setFormData] = useState<ComposeFormData>({
        candidate_id: searchParams.get('candidate_id') || '',
        job_id: searchParams.get('job_id') || '',
        subject: '',
        message: '',
        expires_days: 14
    });

    const [candidate, setCandidate] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [personalizing, setPersonalizing] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            // Fetch recruiter jobs
            const { data: jobData } = await insforge.database
                .from('jobs')
                .select('id, title')
                .eq('recruiter_id', user.id)
                .eq('status', 'active');
            setJobs(jobData || []);

            // Fetch candidate if ID provided
            if (formData.candidate_id) {
                const { data: candData } = await insforge.database
                    .from('profiles')
                    .select('*, candidate_profiles(headline)')
                    .eq('id', formData.candidate_id)
                    .single();
                
                if (candData) {
                    const cp = Array.isArray(candData.candidate_profiles) ? candData.candidate_profiles[0] : candData.candidate_profiles;
                    setCandidate({
                        id: candData.id,
                        full_name: candData.name,
                        email: candData.email,
                        current_role: cp?.headline || 'Candidate'
                    });
                    
                    setFormData(prev => ({
                        ...prev,
                        subject: `Opportunity at TalentMesh: ${candData.name}, let's chat!`
                    }));
                }
            }
        };

        fetchData();
    }, [user?.id, formData.candidate_id]);

    const handlePersonalize = async () => {
        if (!candidate || !formData.job_id) {
            toast.error('Select a job and candidate first');
            return;
        }

        setPersonalizing(true);
        try {
            const { data, error } = await invokeFunction('nvite-personalizer', {
                body: {
                    candidate_id: candidate.id,
                    job_id: formData.job_id,
                    recruiter_id: user?.id
                }
            });

            if (error) throw error;

            setFormData(prev => ({
                ...prev,
                subject: data.subject || prev.subject,
                message: data.message || prev.message
            }));
            toast.success('AI Personalization complete!');
        } catch (err) {
            console.error('Personalization error:', err);
            toast.error('Failed to personalize message');
        } finally {
            setPersonalizing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !candidate) return;

        setLoading(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + formData.expires_days);

            const { error } = await insforge.database
                .from('nvites')
                .insert([{
                    recruiter_id: user.id,
                    candidate_id: candidate.id,
                    job_id: formData.job_id || null,
                    message: formData.message,
                    status: 'pending'
                }]);

            if (error) throw error;

            toast.success('NVite sent successfully!');
            router.push(`/dashboard/recruiter/${roleId}/nvite`);
        } catch (err) {
            console.error('Send error:', err);
            toast.error('Failed to send NVite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.composePage}>
            <header className={styles.header}>
                <h1 className={styles.title}>Compose NVite</h1>
            </header>

            <form className={styles.layout} onSubmit={handleSubmit}>
                <div className={styles.formCard}>
                    {candidate && (
                        <div className={styles.candidateInfo}>
                            <div className={styles.avatar}>
                                {candidate.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.9rem' }}>{candidate.full_name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{candidate.current_role}</span>
                            </div>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Select Job Positioning</label>
                        <CustomSelect 
                            className={styles.select}
                            value={formData.job_id || ''}
                            onChange={(e) => setFormData({...formData, job_id: e.target.value})}
                            options={[
                                { label: 'General Outreach (No specific job)', value: '' },
                                ...jobs.map(j => ({ label: j.title, value: j.id }))
                            ]}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Subject Line</label>
                        <input 
                            type="text"
                            className={styles.input}
                            value={formData.subject}
                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            required
                        />
                    </div>

                    <div className={styles.aiActions}>
                        <button 
                            type="button" 
                            className={`${styles.aiBtn} ${styles.aiBtnPrimary} ${personalizing ? styles.loading : ''}`}
                            onClick={handlePersonalize}
                            disabled={personalizing}
                        >
                            {IC.sparkles} {personalizing ? 'Personalizing...' : 'AI Personalize Message'}
                        </button>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Message Body</label>
                        <textarea 
                            className={styles.textarea}
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            placeholder="Type your message here or use AI to personalize it based on the candidate's profile..."
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Expiration</label>
                        <CustomSelect 
                            className={styles.select}
                            value={formData.expires_days.toString()}
                            onChange={(e) => setFormData({...formData, expires_days: parseInt(e.target.value) as any})}
                            options={[
                                { label: '7 Days', value: '7' },
                                { label: '14 Days', value: '14' },
                                { label: '30 Days', value: '30' }
                            ]}
                        />
                    </div>

                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>Cancel</button>
                        <button type="submit" className={styles.sendBtn} disabled={loading}>
                            {IC.send} {loading ? 'Sending...' : 'Send NVite'}
                        </button>
                    </div>
                </div>

                <aside className={styles.previewCard}>
                    <h2 className={styles.previewTitle}>Live Preview</h2>
                    <div className={styles.mockEmail}>
                        <div className={styles.emailHeader}>
                            <div className={styles.emailHeaderRow}>
                                <span className={styles.headerLabel}>To:</span>
                                <span>{candidate?.full_name || 'Select a candidate'} &lt;{candidate?.email || 'email@example.com'}&gt;</span>
                            </div>
                            <div className={styles.emailHeaderRow}>
                                <span className={styles.headerLabel}>From:</span>
                                <span>{user?.name || 'Recruiter'} via TalentMesh</span>
                            </div>
                            <div className={styles.emailHeaderRow} style={{ marginTop: '0.5rem' }}>
                                <span className={styles.headerLabel}>Subject:</span>
                                <span style={{ color: '#0f172a', fontWeight: 500 }}>{formData.subject || '(No Subject)'}</span>
                            </div>
                        </div>
                        <div className={styles.emailBody}>
                            {formData.message || 'Start typing your message to see a preview...'}
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                        <p style={{ fontSize: '0.75rem', color: '#065f46', lineHeight: '1.5' }}>
                            <strong>Pro Tip:</strong> NVites that mention specific skills found in the candidate's profile have a 40% higher response rate.
                        </p>
                    </div>
                </aside>
            </form>
        </div>
    );
}

export default function ComposeNVitePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading composer...</div>}>
            <ComposeContent />
        </Suspense>
    );
}
