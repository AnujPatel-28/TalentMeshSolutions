"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { CandidateSettingsBundle } from '@/lib/candidate-profile';
import { normalizeCandidateProfile, getDefaultCandidateProfile } from '@/lib/candidate-profile';
import { invokeFunction, insforge } from '@/lib/insforge';
import { validateNewPassword, PASSWORD_MIN_LENGTH } from '@/lib/validation/auth';
import Toast from '@/components/ui/Toast';
import { FormSkeleton } from '@/components/ui/LoadingSkeletons';
import YourDataPanel from '@/components/dpdp/YourDataPanel';
import styles from './settings.module.css';

/* ─── Icons ─── */
const IC = {
    profile: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    preferences: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    ),
    security: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    notifications: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    privacy: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    trash: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    )
};

const EMPTY_STATE: CandidateSettingsBundle = {
    profile: { id: '', email: '', name: '', phone: '', location: '', role: null, completed_onboarding: false },
    candidateProfile: getDefaultCandidateProfile(),
};

export default function SettingsPage() {
    const params = useParams();
    const router = useRouter();
    const roleId = params.role_id as string;
    const { refreshUser } = useAuth();

    const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'notifications' | 'privacy'>('profile');
    const { user } = useAuth();
    const [form, setForm] = useState<CandidateSettingsBundle>(EMPTY_STATE);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);

    // Edit states for individual fields
    const [editValue, setEditValue] = useState('');
    const [editValue2, setEditValue2] = useState(''); // Secondary value for ranges

    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    useEffect(() => {
        if (tabParam === 'privacy' || tabParam === 'security' || tabParam === 'profile' || tabParam === 'preferences' || tabParam === 'notifications') {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    const [consents, setConsents] = useState<Record<string, 'granted' | 'withdrawn'>>({});
    const [consentSaving, setConsentSaving] = useState<string | null>(null);

    const [otpStep, setOtpStep] = useState<'password' | 'otp'>('password');
    const [newPassword, setNewPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await invokeFunction('candidate-profile', { method: 'GET' });
                const data = res.data;
                if (!data || !data.profile) throw new Error('Profile not found');

                const bundle: CandidateSettingsBundle = {
                    profile: {
                        id: data.profile.id,
                        email: data.profile.email,
                        name: data.profile.name || '',
                        phone: data.profile.phone || '',
                        location: data.profile.location || '',
                        role: data.profile.role,
                        completed_onboarding: data.profile.completed_onboarding || false,
                        bio: data.profile.bio || '',
                    },
                    candidateProfile: normalizeCandidateProfile(data.candidateProfile || {})
                };
                setForm(bundle);
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

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

    const handleSaveField = async (fieldName: string) => {
        try {
            let updatedProfile = { ...form.profile };
            let updatedCand = { ...form.candidateProfile };

            if (fieldName === 'name') updatedProfile.name = editValue;
            if (fieldName === 'phone') updatedProfile.phone = editValue;
            if (fieldName === 'location') updatedProfile.location = editValue;
            if (fieldName === 'bio') (updatedProfile as any).bio = editValue;
            if (fieldName === 'headline') updatedCand.headline = editValue;
            if (fieldName === 'job_type') updatedCand.job_types = [editValue];
            if (fieldName === 'expected_salary') {
                updatedCand.salary_min = Number(editValue) || null;
                updatedCand.salary_max = Number(editValue2) || null;
            }
            if (fieldName === 'skills') {
                updatedCand.skills = editValue.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (fieldName === 'experience_years') {
                updatedCand.experience_years = editValue ? Number(editValue) : null;
            }
            if (fieldName === 'preferred_locations') {
                updatedCand.preferred_locations = editValue.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (fieldName === 'open_to_remote') {
                updatedCand.open_to_remote = editValue === 'true';
            }

            await invokeFunction('candidate-profile', {
                method: 'PUT',
                body: {
                    profile: {
                        ...updatedProfile,
                        role: updatedProfile.role === null ? undefined : updatedProfile.role,
                    },
                    candidateProfile: updatedCand
                }
            });

            setForm({ profile: updatedProfile, candidateProfile: updatedCand });
            setEditingField(null);
            setToast({ message: 'Settings saved successfully!', type: 'success' });
            await refreshUser(true);
        } catch (err: any) {
            setToast({ message: err.message || 'Save failed', type: 'error' });
        }
    };

    const handleSendPasswordOtp = async () => {
        const pwdError = newPassword ? validateNewPassword(newPassword) : 'Password is required.';
        if (pwdError) {
            setToast({ message: pwdError, type: 'error' });
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const { error } = await insforge.auth.sendResetPasswordEmail({
                email: form.profile.email
            });
            if (error) {
                setToast({ message: "Couldn't send verification email. Please try again or contact support.", type: 'error' });
                return;
            }
            setOtpStep('otp');
            setToast({ message: 'A 6-digit verification code has been sent to your email.', type: 'success' });
        } catch (err: any) {
            setToast({ message: "Couldn't send verification email. Please try again or contact support.", type: 'error' });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleVerifyPasswordOtp = async () => {
        if (otpCode.length !== 6) {
            setToast({ message: 'Please enter a valid 6-digit verification code.', type: 'error' });
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const { data, error: verifyError } = await insforge.auth.exchangeResetPasswordToken({
                email: form.profile.email,
                code: otpCode,
            });
            if (verifyError) throw verifyError;
            if (!data?.token) throw new Error('Failed to retrieve verification token.');

            const { error: resetError } = await insforge.auth.resetPassword({
                newPassword: newPassword,
                otp: data.token,
            });
            if (resetError) throw resetError;

            setEditingField(null);
            setOtpStep('password');
            setNewPassword('');
            setOtpCode('');
            setShowPassword(false);
            setToast({ message: 'Password updated successfully!', type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message || 'Verification and update failed.', type: 'error' });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleToggleConsent = async (purpose: 'profile_visible_to_recruiters' | 'marketing_email') => {
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
            setToast({
                message: nextStatus === 'granted' ? 'Consent granted' : 'Consent withdrawn',
                type: 'info',
            });
        } catch (e: any) {
            setToast({ message: e.message || 'Update failed', type: 'error' });
        } finally {
            setConsentSaving(null);
        }
    };

    const chevronRight = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
    );

    if (isLoading) {
        return <FormSkeleton fields={5} />;
    }

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 64px)', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f8fafc' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ─── Left Sidebar ─── */}
            <div style={{ width: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '24px 16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#12263A', margin: '0 0 24px 8px', letterSpacing: '-0.02em' }}>
                    Settings
                </h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {([
                        { id: 'profile', label: 'Account settings', desc: 'Your contact information', icon: IC.profile },
                        { id: 'security', label: 'Security settings', desc: 'Password and protection', icon: IC.security, isNew: true },
                        { id: 'notifications', label: 'Communications', desc: 'Alerts and preferences', icon: IC.notifications },
                        { id: 'preferences', label: 'Device & Job preferences', desc: 'Salary, titles and options', icon: IC.preferences },
                        { id: 'privacy', label: 'Privacy settings', desc: 'Your visibility preferences', icon: IC.privacy },
                    ] as const).map(tab => {
                        const isActive = activeTab === (tab.id as any);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); setEditingField(null); }}
                                className={styles.settingsTabBtn}
                                style={{
                                    backgroundColor: isActive ? '#f0f7ff' : 'transparent',
                                }}
                            >
                                <span style={{ color: isActive ? '#007BFF' : '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                    {tab.icon}
                                </span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: isActive ? '#0056b3' : '#1e293b' }}>{tab.label}</span>
                                        {(tab as any).isNew && (
                                            <span className={styles.pillBadge}>New</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>{tab.desc}</span>
                                </div>
                                <span style={{ color: '#cbd5e1', flexShrink: 0 }}>{chevronRight}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Right Panel ─── */}
            <div style={{ flex: 1, padding: '3rem 4rem', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>

                    {activeTab === 'profile' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Account settings</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage your primary account details and communication address.</p>
                            </div>
                            
                            <div className={styles.settingsCard}>
                                {([
                                    { field: 'account_type', label: 'Account type', value: 'Jobseeker', editable: false },
                                    { field: 'email', label: 'Email', value: form.profile.email, editable: false },
                                    { field: 'name', label: 'Full name', value: form.profile.name, action: 'Change name', editable: true },
                                    { field: 'phone', label: 'Phone number', value: form.profile.phone || 'Not added', action: 'Change phone number', editable: true },
                                    { field: 'location', label: 'Location', value: form.profile.location || 'Not added', action: 'Change location', editable: true },
                                    { field: 'bio', label: 'Bio / Short summary', value: (form.profile as any).bio || 'Not added', action: 'Change bio', editable: true },
                                ] as const).map(row => (
                                    <div key={row.field} className={styles.settingsRow}>
                                        {editingField === row.field ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'stretch' }}>
                                                {row.field === 'bio' ? (
                                                    <textarea
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className={styles.settingsInput}
                                                        style={{ minHeight: '100px', resize: 'vertical', width: '100%' }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className={styles.settingsInput}
                                                        style={{ width: '100%' }}
                                                        autoFocus
                                                    />
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                                                    <button onClick={() => handleSaveField(row.field as any)} className={styles.actionBtnPrimary}>Save</button>
                                                    <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{row.label}</span>
                                                    <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.value}</span>
                                                </div>
                                                {row.editable && (
                                                    <button
                                                        onClick={() => { setEditingField(row.field as any); setEditValue((form.profile as any)[row.field] || ''); }}
                                                        style={{ background: 'none', border: 'none', color: '#007BFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '6px', transition: 'background 0.2s', alignSelf: 'center' }}
                                                        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                                        onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        {row.action}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Job preferences</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Configure how matches and search queries are tailored to your profile.</p>
                            </div>
                            
                            <div className={styles.settingsCard}>
                                {/* Row 1: Headline */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'headline' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <input 
                                                type="text" 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveField('headline')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Job Title / Headline</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.headline || 'Not set'}</span>
                                            </div>
                                            <button onClick={() => { setEditingField('headline'); setEditValue(form.candidateProfile.headline || ''); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 2: Job Type */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'job_type' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <select 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                                style={{ padding: '10px' }}
                                            >
                                                <option value="Full-time">Full-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Freelance">Freelance</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                            <button onClick={() => handleSaveField('job_type')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Job Type</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.job_types?.[0] || 'Full-time'}</span>
                                            </div>
                                            <button onClick={() => { setEditingField('job_type'); setEditValue(form.candidateProfile.job_types?.[0] || 'Full-time'); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 3: Expected Salary */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'expected_salary' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <input 
                                                type="number" 
                                                placeholder="Min Salary" 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Max Salary" 
                                                value={editValue2} 
                                                onChange={(e) => setEditValue2(e.target.value)} 
                                                className={styles.settingsInput}
                                            />
                                            <button onClick={() => handleSaveField('expected_salary')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Expected Salary</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>
                                                    {form.candidateProfile.salary_min ? `${form.candidateProfile.currency} ${form.candidateProfile.salary_min.toLocaleString()} - ${form.candidateProfile.salary_max ? form.candidateProfile.salary_max.toLocaleString() : 'No max'}` : 'Not set'}
                                                </span>
                                            </div>
                                            <button onClick={() => { setEditingField('expected_salary'); setEditValue(String(form.candidateProfile.salary_min || '')); setEditValue2(String(form.candidateProfile.salary_max || '')); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 4: Skills */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'skills' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <input 
                                                type="text" 
                                                placeholder="React, TypeScript, Node.js" 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveField('skills')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Skills</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.skills?.join(', ') || 'Not set'}</span>
                                            </div>
                                            <button onClick={() => { setEditingField('skills'); setEditValue(form.candidateProfile.skills?.join(', ') || ''); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 5: Experience (Years) */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'experience_years' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <input 
                                                type="number" 
                                                placeholder="Years of experience" 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveField('experience_years')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Years of Experience</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.experience_years !== null ? `${form.candidateProfile.experience_years} years` : 'Not set'}</span>
                                            </div>
                                            <button onClick={() => { setEditingField('experience_years'); setEditValue(form.candidateProfile.experience_years !== null ? String(form.candidateProfile.experience_years) : ''); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 6: Preferred Locations */}
                                <div className={styles.settingsRow}>
                                    {editingField === 'preferred_locations' ? (
                                        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Bangalore, Mumbai, Remote" 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className={styles.settingsInput}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveField('preferred_locations')} className={styles.actionBtnPrimary}>Save</button>
                                            <button onClick={() => setEditingField(null)} className={styles.actionBtnSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Preferred Locations</span>
                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.preferred_locations?.join(', ') || 'Not set'}</span>
                                            </div>
                                            <button onClick={() => { setEditingField('preferred_locations'); setEditValue(form.candidateProfile.preferred_locations?.join(', ') || ''); }} className={styles.actionBtnSecondary}>Edit</button>
                                        </>
                                    )}
                                </div>

                                {/* Row 7: Open to Remote */}
                                <div className={styles.settingsRow}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Open to Remote Work</span>
                                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{form.candidateProfile.open_to_remote ? 'Yes, open to remote roles' : 'No, on-site/hybrid preferred'}</span>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const nextVal = !form.candidateProfile.open_to_remote;
                                            try {
                                                await invokeFunction('candidate-profile', {
                                                    method: 'PUT',
                                                    body: {
                                                        profile: { ...form.profile, role: form.profile.role === null ? undefined : form.profile.role },
                                                        candidateProfile: { ...form.candidateProfile, open_to_remote: nextVal }
                                                    }
                                                });
                                                setForm(prev => ({
                                                    ...prev,
                                                    candidateProfile: { ...prev.candidateProfile, open_to_remote: nextVal }
                                                }));
                                                setToast({ message: 'Remote preference updated successfully!', type: 'success' });
                                            } catch (e: any) {
                                                setToast({ message: e.message || 'Update failed', type: 'error' });
                                            }
                                        }} 
                                        className={styles.actionBtnSecondary}
                                        style={{ backgroundColor: form.candidateProfile.open_to_remote ? '#e0f2fe' : 'transparent', color: form.candidateProfile.open_to_remote ? '#0369a1' : '#64748b', borderColor: form.candidateProfile.open_to_remote ? '#bae6fd' : '#cbd5e1' }}
                                    >
                                        {form.candidateProfile.open_to_remote ? 'Enabled' : 'Disabled'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Security settings</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage your account protection and authentication credentials.</p>
                            </div>
                            
                            <div className={styles.settingsCard}>
                                <div className={styles.settingsRow}>
                                    {editingField === 'password' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                            {otpStep === 'password' ? (
                                                <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type={showPassword ? 'text' : 'password'} 
                                                            placeholder={`Enter new password (min ${PASSWORD_MIN_LENGTH} chars)`}
                                                            value={newPassword} 
                                                            onChange={(e) => setNewPassword(e.target.value)} 
                                                            className={styles.settingsInput}
                                                            style={{ paddingRight: '40px', width: '100%' }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            style={{
                                                                position: 'absolute',
                                                                right: '12px',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: '#64748b',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '4px',
                                                                borderRadius: '4px',
                                                            }}
                                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                        >
                                                            {showPassword ? (
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                                                    <path d="M10.73 5.08a10.43 10.43 0 0 1 1.27-.08c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                                                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                                                    <line x1="2" y1="2" x2="22" y2="22" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                                    <circle cx="12" cy="12" r="3" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <button onClick={handleSendPasswordOtp} disabled={isVerifyingOtp} className={styles.actionBtnPrimary}>
                                                        {isVerifyingOtp ? 'Sending...' : 'Send Verification OTP'}
                                                    </button>
                                                    <button onClick={() => { setEditingField(null); setNewPassword(''); setShowPassword(false); }} className={styles.actionBtnSecondary}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                                    <span style={{ fontSize: '13px', color: '#0369a1', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px', fontWeight: 500 }}>
                                                        A 6-digit verification code has been sent to <strong>{form.profile.email}</strong>.
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Enter 6-digit code" 
                                                            value={otpCode} 
                                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                                                            className={styles.settingsInput}
                                                            style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '16px', fontWeight: 700 }}
                                                            maxLength={6}
                                                            autoFocus
                                                        />
                                                        <button onClick={handleVerifyPasswordOtp} disabled={isVerifyingOtp} className={styles.actionBtnPrimary}>
                                                            {isVerifyingOtp ? 'Verifying...' : 'Verify & Update'}
                                                        </button>
                                                        <button onClick={() => { setOtpStep('password'); setOtpCode(''); }} className={styles.actionBtnSecondary}>Back</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Security Credentials</span>
                                                <span style={{ fontSize: '15px', color: '#64748b', letterSpacing: '2px' }}>••••••••••••</span>
                                            </div>
                                            <button onClick={() => { setEditingField('password'); setOtpStep('password'); setNewPassword(''); setOtpCode(''); }} className={styles.actionBtnSecondary}>Update Password</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Communications</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Control the frequency and channels of alerts you receive.</p>
                            </div>
                            
                            <div className={styles.settingsCard}>
                                {[
                                    { key: 'recommendations', label: 'Job Recommendations', desc: 'Receive AI-matched roles directly in your inbox' },
                                    { key: 'updates', label: 'Application Updates', desc: 'Status updates on your active submissions' }
                                ].map(item => (
                                    <div key={item.key} className={styles.settingsRow}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{item.label}</span>
                                                <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>Coming Soon</span>
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</span>
                                        </div>
                                        <button
                                            disabled
                                            className={styles.actionBtnSecondary}
                                            style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#94a3b8', borderColor: '#cbd5e1' }}
                                        >
                                            Disabled
                                        </button>
                                    </div>
                                ))}

                                {/* AI suggestions coming soon row */}
                                <div className={styles.settingsRow}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>AI Communication Suggestions</span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>Coming Soon</span>
                                        </div>
                                        <span style={{ fontSize: '13px', color: '#64748b' }}>Get AI-generated suggestions and draft templates for responding to recruiters.</span>
                                    </div>
                                    <button 
                                        disabled
                                        className={styles.actionBtnSecondary}
                                        style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#94a3b8', borderColor: '#cbd5e1' }}
                                    >
                                        Disabled
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Privacy settings</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage your consents. Withdrawing takes effect immediately.</p>
                            </div>

                            <div className={styles.settingsCard}>
                                {([
                                    { purpose: 'profile_visible_to_recruiters' as const, label: 'Recruiter Discoverability', desc: 'Allow verified companies to find your profile and download your resume.' },
                                    { purpose: 'marketing_email' as const, label: 'Marketing & Product Emails', desc: 'Receive marketing and product update emails from TalentMesh.' },
                                ]).map(row => {
                                    const isGranted = consents[row.purpose] === 'granted';
                                    return (
                                        <div key={row.purpose} className={styles.settingsRow}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{row.label}</span>
                                                <span style={{ fontSize: '13px', color: '#64748b', maxWidth: '80%' }}>{row.desc}</span>
                                            </div>

                                            {/* Custom Switch Toggle representation */}
                                            <div
                                                onClick={() => consentSaving ? undefined : handleToggleConsent(row.purpose)}
                                                style={{
                                                    width: '52px',
                                                    height: '28px',
                                                    borderRadius: '99px',
                                                    backgroundColor: isGranted ? '#007BFF' : '#cbd5e1',
                                                    padding: '2px',
                                                    cursor: consentSaving ? 'wait' : 'pointer',
                                                    opacity: consentSaving === row.purpose ? 0.6 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: isGranted ? 'flex-end' : 'flex-start',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    transition: 'all 0.2s ease'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {(['account_processing', 'terms_of_service', 'age_18_plus'] as const).map(purpose => (
                                    <div key={purpose} className={styles.settingsRow}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>
                                                {purpose === 'account_processing' ? 'Account Processing' : purpose === 'terms_of_service' ? 'Terms of Service' : 'Age Attestation (18+)'}
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '80%' }}>Required to operate your account. Withdrawing means deleting your account.</span>
                                        </div>
                                        <button disabled className={styles.actionBtnSecondary} style={{ opacity: 0.5, cursor: 'not-allowed' }}>Granted</button>
                                    </div>
                                ))}
                            </div>

                            <YourDataPanel onToast={(message, type) => setToast({ message, type })} />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
