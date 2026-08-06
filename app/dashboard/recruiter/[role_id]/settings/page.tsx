"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { FormSkeleton } from '@/components/ui/DashboardSkeleton';
import Toast from '@/components/ui/Toast';
import styles from '../../../shared-dashboard.module.css';
import { CustomSelect } from '@/components/ui/CustomSelect';
import YourDataPanel from '@/components/dpdp/YourDataPanel';

/* ─── Icons ─── */
const IC = {
    camera: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
    building: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="10" width="20" height="11" rx="2" /><path d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>,
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    briefcase: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    privacy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

export default function RecruiterSettingsPage() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'hiring' | 'templates' | 'billing' | 'team' | 'privacy'>('profile');
    const [consents, setConsents] = useState<Record<string, 'granted' | 'withdrawn'>>({});
    const [consentSaving, setConsentSaving] = useState<string | null>(null);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        job_title: '',
        phone: '',
        avatar_url: '',
        company_id: '',
        company_name: '',
        industry: 'Technology',
        website: '',
        logo_url: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [provider, setProvider] = useState<string>('email');
    const [recruiterRole, setRecruiterRole] = useState<'admin' | 'recruiter' | 'coordinator'>('recruiter');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = window.sessionStorage.getItem('tm_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                    const prov = payload.app_metadata?.provider || payload.app_metadata?.providers?.[0] || 'email';
                    setProvider(prov);
                } catch (err) {
                    console.warn('Failed to parse OAuth provider from JWT:', err);
                }
            }
        }
    }, []);

    useEffect(() => {
        async function fetchSettings() {
            if (!user) return;
            try {
                const [profRes, compRes] = await Promise.all([
                    invokeFunction('recruiter-profile', { method: 'GET' }),
                    invokeFunction('company-profile', { method: 'GET' })
                ]);

                if (profRes.data) {
                    const p = profRes.data.profile;
                    const rp = profRes.data.recruiterProfile;
                    setRecruiterRole(rp?.recruiter_role || 'recruiter');
                    setProfile(prev => ({
                        ...prev,
                        name: p?.name || '',
                        email: p?.email || '',
                        job_title: rp?.job_title || '',
                        phone: p?.phone || '',
                        avatar_url: p?.avatar_url || ''
                    }));
                }

                if (compRes.data?.company) {
                    const c = compRes.data.company;
                    setProfile(prev => ({
                        ...prev,
                        company_name: c.name || '',
                        industry: c.industry || 'Technology',
                        website: c.website || '',
                        logo_url: c.logo_url || ''
                    }));
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [user]);

    useEffect(() => {
        async function fetchConsents() {
            try {
                const res = await fetch('/api/consent');
                if (!res.ok) return;
                const data = await res.json();
                setConsents(data.consents || {});
            } catch (err) {
                console.error('Error loading consents:', err);
            }
        }
        fetchConsents();
    }, []);

    const handleToggleConsent = async (purpose: 'marketing_email') => {
        const nextStatus = consents[purpose] === 'granted' ? 'withdrawn' : 'granted';
        setConsentSaving(purpose);
        try {
            const res = await fetch('/api/consent/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purpose, status: nextStatus }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to update consent');

            setConsents(prev => ({ ...prev, [purpose]: nextStatus }));
            setToast({ message: nextStatus === 'granted' ? 'Consent granted' : 'Consent withdrawn', type: 'success' });
        } catch (e: any) {
            setToast({ message: e.message || 'Update failed', type: 'error' });
        } finally {
            setConsentSaving(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadProgress(prev => ({ ...prev, [type]: 10 }));
        try {
            const bucketName = type === 'avatar' ? 'avatars' : 'company-logos';
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uuid = window.crypto.randomUUID();
            
            const path = type === 'avatar' 
                ? `${user.id}/${uuid}_${safeName}`
                : `${uuid}_${safeName}`;

            // Clean up old file from storage if it exists to keep storage secure
            const oldUrl = type === 'avatar' ? profile.avatar_url : profile.logo_url;
            if (oldUrl) {
                try {
                    const marker = '/objects/';
                    const markerIndex = oldUrl.indexOf(marker);
                    if (markerIndex !== -1) {
                        let oldPath = oldUrl.substring(markerIndex + marker.length);
                        const qIndex = oldPath.indexOf('?');
                        if (qIndex !== -1) {
                            oldPath = oldPath.substring(0, qIndex);
                        }
                        const decodedPath = decodeURIComponent(oldPath);
                        await insforge.storage.from(bucketName).remove(decodedPath);
                    } else {
                        // It's already a relative path/key
                        await insforge.storage.from(bucketName).remove(oldUrl);
                    }
                } catch (delErr) {
                    console.warn(`Failed to delete old ${type} file from storage:`, delErr);
                }
            }

            const { data: uploadData, error: uploadError } = await insforge.storage
                .from(bucketName)
                .upload(path, file);

            if (uploadError) throw new Error(uploadError.message);
            
            // Log for runtime verification (Release 2)
            // console.log(`[Upload] type=${type} bucket=${bucketName}`, uploadData);
            
            const url = uploadData?.key || '';

            setProfile(prev => ({ ...prev, [type === 'avatar' ? 'avatar_url' : 'logo_url']: url }));
            setUploadProgress(prev => ({ ...prev, [type]: 100 }));
            setTimeout(() => setUploadProgress(prev => ({ ...prev, [type]: 0 })), 2000);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
            setUploadProgress(prev => ({ ...prev, [type]: 0 }));
        }
    };

    const handleSaveAll = async () => {
        if (!user) return;
        setIsSaving(true);
        setToast(null);

        try {
            // 1. Update Recruiter Profile
            const profPromise = invokeFunction('recruiter-profile', {
                method: 'PUT',
                body: {
                    profile: { 
                        name: profile.name, 
                        phone: profile.phone,
                        avatar_url: profile.avatar_url 
                    },
                    recruiterProfile: { 
                        job_title: profile.job_title 
                    }
                }
            });

            // 2. Update Company Profile
            const compPromise = invokeFunction('company-profile', {
                method: 'POST',
                body: {
                    name: profile.company_name,
                    industry: profile.industry,
                    website: profile.website,
                    logo_url: profile.logo_url
                }
            });

            const [pRes, cRes] = await Promise.all([profPromise, compPromise]);

            if (pRes.error) throw pRes.error;
            if (cRes.error) throw cRes.error;

            await refreshUser();
            setToast({ message: 'All settings updated successfully!', type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message || 'Update failed.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <FormSkeleton />;

    return (
        <div className={styles.settingsWrapper}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Settings</h1>
                    <p className={styles.pageSubtitle}>Manage your professional identity and company profile</p>
                </div>
                <button 
                    onClick={handleSaveAll} 
                    disabled={isSaving}
                    className={styles.primaryBtn}
                >
                    {isSaving ? 'Saving Changes...' : 'Save All Settings'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                {/* Left Sidebar Menu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#fafbfc', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', height: 'fit-content' }}>
                    {[
                        { id: 'profile', label: 'Recruiter Profile', icon: IC.user },
                        { id: 'company', label: 'Company Profile', icon: IC.building },
                        { id: 'hiring', label: 'Hiring & Pipeline', icon: IC.briefcase },
                        { id: 'templates', label: 'Job Templates', icon: IC.briefcase },
                        { id: 'billing', label: 'Billing & Subscriptions', icon: IC.globe },
                        { id: 'privacy', label: 'Privacy', icon: IC.privacy },
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    background: isActive ? 'var(--sidebar-active)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.16s'
                                }}
                            >
                                <span style={{ display: 'inline-flex', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right Tab Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {activeTab === 'profile' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{IC.user}</div>
                                <h3 className={styles.cardTitle}>Recruiter Profile</h3>
                            </div>

                            <div className={styles.avatarSection}>
                                <div 
                                    className={styles.avatarLarge}
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {profile.avatar_url ? (
                                        <img src={getPublicStorageUrl('avatars', profile.avatar_url)} alt={profile.name} />
                                    ) : (
                                        profile.name?.charAt(0) || 'R'
                                    )}
                                    <div className={styles.avatarOverlay}>{IC.camera}</div>
                                    <input 
                                        type="file" 
                                        ref={avatarInputRef} 
                                        style={{ display: 'none' }} 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'avatar')}
                                    />
                                </div>
                                <div className={styles.avatarMeta}>
                                    <span className={styles.avatarLabel}>Profile Photo</span>
                                    <span className={styles.avatarHint}>Click to update. PNG or JPG, max 2MB.</span>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.field}>
                                    <label>Full Name</label>
                                    <input 
                                        value={profile.name} 
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>Job Title</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={styles.inputIcon}>{IC.briefcase}</span>
                                        <input 
                                            value={profile.job_title} 
                                            onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                                            placeholder="e.g. Senior Technical Recruiter"
                                        />
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label>Contact Phone</label>
                                    <input 
                                        value={profile.phone} 
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>Email Address</label>
                                    <input value={profile.email} disabled className={styles.inputDisabled} />
                                    <span className={styles.fieldHint}>Email cannot be changed here.</span>
                                </div>
                                <div className={styles.field}>
                                    <label>Role / Permissions</label>
                                    <div style={{ marginTop: '0.35rem' }}>
                                        <span style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            border: '1px solid #cbd5e1',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            textTransform: 'capitalize'
                                        }}>
                                            👤 {recruiterRole}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label>Registration Platform</label>
                                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center' }}>
                                        {provider === 'google' && (
                                            <span style={{
                                                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                                                color: '#1e40af',
                                                border: '1px solid #bfdbfe',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                                                Google Identity
                                            </span>
                                        )}
                                        {provider === 'linkedin' && (
                                            <span style={{
                                                background: 'linear-gradient(135deg, #f0f7ff, #e0f2fe)',
                                                color: '#0369a1',
                                                border: '1px solid #bae6fd',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                LinkedIn OAuth
                                            </span>
                                        )}
                                        {provider !== 'google' && provider !== 'linkedin' && (
                                            <span style={{
                                                background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)',
                                                color: '#6b21a8',
                                                border: '1px solid #e9d5ff',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                Manual Email Login
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{IC.building}</div>
                                <h3 className={styles.cardTitle}>Company Information</h3>
                            </div>

                            <div className={styles.logoSection}>
                                <div 
                                    className={styles.logoBox}
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    {profile.logo_url ? (
                                        <img src={getPublicStorageUrl('company-logos', profile.logo_url)} alt={profile.company_name} />
                                    ) : (
                                        IC.building
                                    )}
                                    <div className={styles.logoOverlay}>{IC.camera}</div>
                                    <input 
                                        type="file" 
                                        ref={logoInputRef} 
                                        style={{ display: 'none' }} 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                    />
                                </div>
                                <div className={styles.logoMeta}>
                                    <span className={styles.avatarLabel}>Company Logo</span>
                                    <span className={styles.avatarHint}>Visible on your job postings.</span>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.field}>
                                    <label>Company Name</label>
                                    <input 
                                        value={profile.company_name} 
                                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>Industry</label>
                                    <CustomSelect 
                                        value={profile.industry} 
                                        onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                                        className={styles.select}
                                        options={['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail']}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>Company Website</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={styles.inputIcon}>{IC.globe}</span>
                                        <input 
                                            value={profile.website} 
                                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hiring' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{IC.briefcase}</div>
                                <h3 className={styles.cardTitle}>Hiring & Pipeline Preferences</h3>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <div className={styles.field}>
                                    <label>Default Interview Stages Sequence</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '0.5rem' }}>
                                        {['Screening', 'Technical Round', 'System Design', 'Culture Fit', 'Offer Stage'].map((stage, idx) => (
                                            <span key={stage} style={{ background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                {idx + 1}. {stage}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.field} style={{ marginTop: '1rem' }}>
                                    <label>Scorecard Grading Type</label>
                                    <CustomSelect 
                                        value="Overall Match (1-5 Stars)"
                                        onChange={() => {}}
                                        className={styles.select}
                                        options={['Overall Match (1-5 Stars)', 'Pass/Fail', 'Detailed Category Rubric']}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{IC.briefcase}</div>
                                <h3 className={styles.cardTitle}>Recruiter Templates</h3>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <div className={styles.field}>
                                    <label>Default Email Template</label>
                                    <textarea 
                                        style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                        defaultValue={`Hi {{candidate_name}},\n\nThank you for applying to the {{job_title}} role at {{company_name}}. We reviewed your application and would love to schedule a brief call.`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <rect width="20" height="14" x="2" y="5" rx="2" />
                                        <line x1="2" x2="22" y1="10" y2="10" />
                                    </svg>
                                </div>
                                <h3 className={styles.cardTitle}>Billing & Subscription</h3>
                            </div>

                            {recruiterRole === 'admin' ? (
                                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                    <div className={styles.field}>
                                        <label>Subscription Plan</label>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>Enterprise Plan</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Renews on July 15, 2026</div>
                                            </div>
                                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>Active</span>
                                        </div>
                                    </div>
                                    <div className={styles.field} style={{ marginTop: '1rem' }}>
                                        <label>Billing Email</label>
                                        <input placeholder="billing@company.com" defaultValue="billing@company.com" />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ 
                                    marginTop: '1.5rem', 
                                    padding: '1rem', 
                                    backgroundColor: '#fef2f2', 
                                    border: '1px solid #fecaca', 
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    color: '#991b1b'
                                }}>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                        Access Restricted
                                    </div>
                                    <p style={{ fontSize: '0.85rem', margin: 0, color: '#7f1d1d', lineHeight: '1.4' }}>
                                        Billing and subscription configurations are restricted. You are currently logged in as a <strong>{recruiterRole}</strong>. Only Company Admins can manage billing settings.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{IC.privacy}</div>
                                <h3 className={styles.cardTitle}>Privacy</h3>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <div className={styles.field} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ margin: 0 }}>Marketing & Product Emails</label>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Receive marketing and product update emails from TalentMesh.</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleConsent('marketing_email')}
                                        disabled={!!consentSaving}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            borderColor: consents.marketing_email === 'granted' ? '#bae6fd' : 'var(--color-border)',
                                            backgroundColor: consents.marketing_email === 'granted' ? '#e0f2fe' : 'transparent',
                                            color: consents.marketing_email === 'granted' ? '#0369a1' : '#64748b',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            cursor: consentSaving ? 'wait' : 'pointer',
                                            opacity: consentSaving === 'marketing_email' ? 0.6 : 1,
                                        }}
                                    >
                                        {consents.marketing_email === 'granted' ? 'Enabled — Withdraw' : 'Disabled — Grant'}
                                    </button>
                                </div>
                            </div>

                            <YourDataPanel onToast={(message, type) => setToast({ message, type })} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
