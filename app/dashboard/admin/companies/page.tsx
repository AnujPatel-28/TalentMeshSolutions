"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from '../jobs/jobs.module.css';
import { invokeFunction } from '@/lib/insforge';
import { AdminHeader } from '../_components/AdminHeader';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminInput } from '../_components/AdminForm';
import { CompanyRegisterForm } from '../_components/CompanyRegisterForm';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import StatusPill from '@/components/dashboard/StatusPill';

type AdminCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  gstin: string | null;
  status: string;
  created_at?: string;
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const fetchCompanies = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      const { data, error } = await invokeFunction('admin-companies', {
        method: 'GET',
        queries: term ? { search: term } : {},
      });

      if (!error) {
        setCompanies(data.companies || []);
      } else {
        setError(error.message || 'Failed to load companies');
      }
    } catch (err) {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const t = setTimeout(() => fetchCompanies(search.trim() || undefined), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Manage Companies"
        eyebrow="TalentMesh Organizations"
        subtitle="Manage the global list of verified organizations and their brand assets."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard/admin' }, { label: 'Companies' }]}
      />

      <div className={styles.stats} style={{ marginBottom: '32px' }}>
        <AdminStatCard
          label="Registered Entities"
          value={companies.length}
          color="indigo"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /></svg>}
        />
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      <div className={styles.grid}>
        <div className={styles.listPanel}>
          <div style={{ padding: '16px' }}>
            <AdminInput
              label="Search by name or GSTIN"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Acme Tech or 27AAPFU0939F1ZV"
            />
          </div>
          <div className={styles.listBody}>
            {loading ? <div className={styles.emptyState}>Syncing entities...</div> :
              companies.length === 0 ? <div className={styles.emptyState}>No registered companies found.</div> : (
                companies.map(company => (
                  <Link key={company.id} href={`/dashboard/admin/companies/${company.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <article className={styles.jobCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {company.logo_url ? (
                            <img src={getPublicStorageUrl('company-logos', company.logo_url)} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 700 }}>{company.name[0]}</span>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.jobCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2 className={styles.jobTitle} style={{ fontSize: '1.1rem', margin: 0 }}>{company.name}</h2>
                            <StatusPill status={company.status} />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <p className={styles.jobMeta} style={{ margin: 0, fontFamily: 'monospace' }}>
                              {company.gstin || 'No GSTIN on file'}
                            </p>
                            <p className={styles.jobMeta} style={{ margin: 0 }}>
                              {company.created_at ? new Date(company.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))
              )}
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Platform Onboarding</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Provision new organizational identities into the system.</p>
          </div>

          <CompanyRegisterForm
            onSuccess={() => {
              setSuccess('Company created successfully.');
              fetchCompanies(search.trim() || undefined);
            }}
          />
        </div>
      </div>
    </section>
  );
}
