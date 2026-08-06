'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { insforge, invokeFunction } from '@/lib/insforge';
import styles from './plans.module.css';

interface Plan {
    id: string;
    key: string;
    name: string;
    tagline: string;
    price_monthly_inr: number | null;
    price_annual_inr: number | null;
    is_popular: boolean;
    is_active: boolean;
    display_order: number;
    recruiter_seats: number | null;
    active_jobs: number | null;
    ai_calls_per_month: number | null;
    features: string[];
    cta_label: string;
    cta_url: string;
}

export default function PlansEditorPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [riskAccepted, setRiskAccepted] = useState(false);

    const fetchPlans = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await invokeFunction('admin-plans', {
                method: 'GET'
            });

            if (error) throw error;
            const formatted = (data || []).map((p: any) => ({
                ...p,
                price_monthly_inr: p.price_monthly_inr !== null ? p.price_monthly_inr / 100 : null,
                price_annual_inr: p.price_annual_inr !== null ? p.price_annual_inr / 100 : null
            }));
            setPlans(formatted);
        } catch (err) {
            console.error('Fetch Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const handlePlanChange = (key: string, updates: Partial<Plan>) => {
        setPlans(prev => prev.map(p => {
            if (p.key === key) {
                // If setting is_popular=true, unset others
                if (updates.is_popular === true) {
                    // This handled in the loop below or here?
                    // We'll handle popular logic in the save or as a side effect
                }
                return { ...p, ...updates };
            }
            // Side effect for popular: if another plan is being set to popular, unset this one
            if (updates.is_popular === true && p.key !== key) {
                return { ...p, is_popular: false };
            }
            return p;
        }));
    };

    const handleSave = async (plan: Plan) => {
        setIsSaving(plan.key);
        try {
            const { error } = await invokeFunction('admin-plans', {
                method: 'PATCH',
                queries: { key: plan.key },
                body: {
                    name: plan.name,
                    tagline: plan.tagline,
                    price_monthly_inr: plan.price_monthly_inr !== null ? plan.price_monthly_inr * 100 : null,
                    price_annual_inr: plan.price_annual_inr !== null ? plan.price_annual_inr * 100 : null,
                    is_popular: plan.is_popular,
                    is_active: plan.is_active,
                    recruiter_seats: plan.recruiter_seats,
                    active_jobs: plan.active_jobs,
                    ai_calls_per_month: plan.ai_calls_per_month,
                    features: plan.features,
                    cta_label: plan.cta_label,
                    cta_url: plan.cta_url
                }
            });

            if (error) throw error;
            alert(`${plan.name} plan saved successfully!`);
            fetchPlans();
        } catch (err) {
            console.error('Save Error:', err);
            alert('Failed to save plan.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to reset all plans to default? This will overwrite your changes.')) return;
        // Seeding logic here (normally would be a server-side reset)
        // For now, we'll just re-insert the defaults via SQL-like logic or just fetch again if we had a reset function
        alert('Resetting to defaults...');
        // Mocking reset: in a real app, this would call an RPC or a specialized edge function
    };

    const handleDeactivate = async (plan: Plan) => {
        if (!confirm(`Are you sure you want to deactivate the ${plan.name} plan?`)) return;
        await handleSave({ ...plan, is_active: false });
        fetchPlans();
    };

    if (isLoading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading plan editor...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Subscription Plans</h1>
                <Link href="/pricing" className={styles.badge} target="_blank">
                    Plans are live on the pricing page →
                </Link>
            </header>

            <div className={styles.grid}>
                {plans.map(plan => (
                    <div key={plan.id} className={styles.card}>
                        <div className={styles.popularRow}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Plan ID</label>
                                <code style={{ fontSize: '0.8rem', color: '#64748b' }}>{plan.key}</code>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <label className={styles.label} style={{ display: 'block', marginBottom: '0.25rem' }}>Popular?</label>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={plan.is_popular}
                                        onChange={(e) => handlePlanChange(plan.key, { is_popular: e.target.checked })}
                                    />
                                    <span className={styles.slider} />
                                </label>
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Plan Name</label>
                            <input
                                className={styles.input}
                                value={plan.name}
                                onChange={(e) => handlePlanChange(plan.key, { name: e.target.value })}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Tagline</label>
                            <input
                                className={styles.input}
                                value={plan.tagline}
                                onChange={(e) => handlePlanChange(plan.key, { tagline: e.target.value })}
                            />
                        </div>

                        <div className={styles.section}>
                            <span className={styles.sectionTitle}>Pricing</span>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Monthly (INR)</label>
                                <div className={styles.priceWrapper}>
                                    <span className={styles.currency}>₹</span>
                                    <input
                                        type="number"
                                        className={`${styles.input} ${styles.priceInput}`}
                                        value={plan.price_monthly_inr ?? ''}
                                        placeholder="Custom"
                                        onChange={(e) => handlePlanChange(plan.key, { price_monthly_inr: e.target.value ? parseInt(e.target.value) : null })}
                                    />
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Annual (INR)</label>
                                <div className={styles.priceWrapper}>
                                    <span className={styles.currency}>₹</span>
                                    <input
                                        type="number"
                                        className={`${styles.input} ${styles.priceInput}`}
                                        value={plan.price_annual_inr ?? ''}
                                        placeholder="Custom"
                                        onChange={(e) => handlePlanChange(plan.key, { price_annual_inr: e.target.value ? parseInt(e.target.value) : null })}
                                    />
                                </div>
                            </div>
                            {plan.price_monthly_inr && plan.price_annual_inr && (
                                <div className={styles.savings}>
                                    Annual saves ₹{(plan.price_monthly_inr * 12) - plan.price_annual_inr} vs monthly
                                </div>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={plan.price_monthly_inr === null}
                                    onChange={(e) => {
                                        if (e.target.checked) handlePlanChange(plan.key, { price_monthly_inr: null, price_annual_inr: null });
                                        else handlePlanChange(plan.key, { price_monthly_inr: 0, price_annual_inr: 0 });
                                    }}
                                />
                                Custom/Enterprise Pricing
                            </label>
                        </div>

                        <div className={styles.section}>
                            <span className={styles.sectionTitle}>Limits</span>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Recruiter Seats</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={plan.recruiter_seats ?? ''}
                                    placeholder="Unlimited"
                                    onChange={(e) => handlePlanChange(plan.key, { recruiter_seats: e.target.value ? parseInt(e.target.value) : null })}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Active Jobs</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={plan.active_jobs ?? ''}
                                    placeholder="Unlimited"
                                    onChange={(e) => handlePlanChange(plan.key, { active_jobs: e.target.value ? parseInt(e.target.value) : null })}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>AI Calls/month</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={plan.ai_calls_per_month ?? ''}
                                    placeholder="Unlimited"
                                    onChange={(e) => handlePlanChange(plan.key, { ai_calls_per_month: e.target.value ? parseInt(e.target.value) : null })}
                                />
                            </div>
                        </div>

                        <div className={styles.section}>
                            <span className={styles.sectionTitle}>Features</span>
                            <div className={styles.featuresList}>
                                {plan.features.map((feature, fIdx) => (
                                    <div key={fIdx} className={styles.featureRow}>
                                        <input
                                            className={styles.featureInput}
                                            value={feature}
                                            onChange={(e) => {
                                                const newFeats = [...plan.features];
                                                newFeats[fIdx] = e.target.value;
                                                handlePlanChange(plan.key, { features: newFeats });
                                            }}
                                        />
                                        <button className={styles.removeBtn} onClick={() => {
                                            handlePlanChange(plan.key, { features: plan.features.filter((_, i) => i !== fIdx) });
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                                <button className={styles.addBtn} onClick={() => handlePlanChange(plan.key, { features: [...plan.features, 'New feature'] })}>
                                    + Add Feature
                                </button>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <span className={styles.sectionTitle}>CTA Settings</span>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Label</label>
                                <input
                                    className={styles.input}
                                    value={plan.cta_label}
                                    onChange={(e) => handlePlanChange(plan.key, { cta_label: e.target.value })}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>URL</label>
                                <input
                                    className={styles.input}
                                    value={plan.cta_url}
                                    onChange={(e) => handlePlanChange(plan.key, { cta_url: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            className={styles.saveBtn}
                            onClick={() => handleSave(plan)}
                            disabled={isSaving === plan.key}
                        >
                            {isSaving === plan.key ? 'Saving...' : 'Save Plan Changes'}
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.previewSection}>
                <div className={styles.previewHeader}>
                    <h2>Live Preview</h2>
                    <Link href="/pricing" target="_blank" style={{ color: '#6366f1', fontSize: '0.9rem', fontWeight: 600 }}>View full pricing page →</Link>
                </div>

                <div className={styles.previewGrid}>
                    {plans.filter(p => p.is_active).map(plan => (
                        <div key={plan.id} className={`${styles.previewPlan} ${plan.is_popular ? styles.previewPlanPopular : ''}`}>
                            {plan.is_popular && <span className={styles.popularBadge}>MOST POPULAR</span>}
                            <div className={styles.previewName}>{plan.name}</div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{plan.tagline}</p>

                            <div className={styles.previewPrice}>
                                {plan.price_monthly_inr ? (
                                    <>₹{plan.price_monthly_inr.toLocaleString()}<span>/mo</span></>
                                ) : (
                                    'Custom'
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {plan.features.map((feat, idx) => (
                                    <div key={idx} className={styles.previewFeature}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={styles.check}>
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {feat}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.previewCTA}>{plan.cta_label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.dangerZone}>
                <h2>Danger Zone</h2>
                <p style={{ fontSize: '0.9rem', color: '#b91c1c' }}>Careful! Changes here affect live revenue and public pricing immediately.</p>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={riskAccepted} onChange={(e) => setRiskAccepted(e.target.checked)} />
                    I understand that these changes are live on production.
                </label>

                <div className={styles.dangerActions}>
                    {plans.map(p => (
                        <button
                            key={p.id}
                            className={styles.dangerBtn}
                            disabled={!riskAccepted || !p.is_active}
                            onClick={() => handleDeactivate(p)}
                        >
                            Deactivate {p.name}
                        </button>
                    ))}
                    <button
                        className={styles.dangerBtn}
                        style={{ marginLeft: 'auto', background: '#fee2e2' }}
                        disabled={!riskAccepted}
                        onClick={handleReset}
                    >
                        Reset All to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
