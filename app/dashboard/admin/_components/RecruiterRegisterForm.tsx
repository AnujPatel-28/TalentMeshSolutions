"use client";

import { useState } from 'react';
import { invokeFunction } from '@/lib/insforge';
import { AdminInput, AdminButton, AdminSelect, AdminTextArea } from './AdminForm';

interface RecruiterRegisterFormProps {
  onSuccess?: (result: { newCompany: boolean; companyId: string }) => void;
  onCancel?: () => void;
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Doc 14 R-7 (e): a thin wrapper over the same intake shape as
// /api/recruiter/request-access (doc 06) — company resolved/created by GSTIN, member invited,
// verification request opened for a new company. No password is ever set or shown here; the
// invitee receives a password-set link by email.
export function RecruiterRegisterForm({ onSuccess, onCancel }: RecruiterRegisterFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ newCompany: boolean } | null>(null);

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    gstin: '',
    company_name: '',
    company_website: '',
    company_cin: '',
    industry: '',
    size: '',
    location: '',
    reason: '',
  });

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!GSTIN_RE.test(form.gstin.trim().toUpperCase())) {
      setError('A valid GSTIN is required (e.g. 27AAPFU0939F1ZV).');
      return;
    }
    if (form.reason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required.');
      return;
    }

    setSaving(true);
    try {
      const { data, error: apiError } = await invokeFunction('admin-recruiters', {
        method: 'POST',
        body: {
          action: 'create-on-behalf',
          email: form.email,
          full_name: form.full_name,
          phone: form.phone || undefined,
          gstin: form.gstin.trim().toUpperCase(),
          company_name: form.company_name.trim() || undefined,
          company_website: form.company_website.trim() || undefined,
          company_cin: form.company_cin.trim() || undefined,
          industry: form.industry || undefined,
          size: form.size || undefined,
          location: form.location.trim() || undefined,
          reason: form.reason.trim(),
        },
      });

      if (apiError) throw new Error(apiError.message);

      setSuccess({ newCompany: !!data?.newCompany });
      setTimeout(() => onSuccess?.({ newCompany: !!data?.newCompany, companyId: data?.company?.id }), 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to invite recruiter');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', border: '1px solid #d1fae5' }}>
          Recruiter invited. A password-set link was emailed to them.
          {success.newCompany && ' The company they belong to is new and needs approval in the Verification queue before they can post jobs.'}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fee2e2' }}>{error}</div>}

      <AdminInput label="Full Name" value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} required />
      <AdminInput label="Email Address" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required />
      <AdminInput label="Phone (optional)" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91XXXXXXXXXX" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <AdminInput
          label="Company GSTIN"
          value={form.gstin}
          onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
          required
          maxLength={15}
          placeholder="e.g. 27AAPFU0939F1ZV"
        />
        <AdminInput label="Company CIN (optional, new company only)" value={form.company_cin} onChange={(e) => handleChange('company_cin', e.target.value.toUpperCase())} maxLength={21} />
      </div>

      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.5rem' }}>
        If this GSTIN already belongs to a registered company, the recruiter is invited to join it directly. Otherwise
        fill in the fields below to register a new company — it will need Verification-queue approval.
      </p>

      <AdminInput label="Company Name (required for a new company)" value={form.company_name} onChange={(e) => handleChange('company_name', e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <AdminInput label="Company Website" value={form.company_website} onChange={(e) => handleChange('company_website', e.target.value)} placeholder="https://example.com" />
        <AdminInput label="Location" value={form.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="City, Country" />
      </div>
      <AdminSelect
        label="Industry"
        value={form.industry}
        onChange={(e) => handleChange('industry', e.target.value)}
        options={[
          { value: '', label: 'Select Industry' },
          { value: 'Technology', label: 'Technology' },
          { value: 'Healthcare', label: 'Healthcare' },
          { value: 'Finance', label: 'Finance' },
          { value: 'Other', label: 'Other' },
        ]}
      />
      <AdminSelect
        label="Company Size"
        value={form.size}
        onChange={(e) => handleChange('size', e.target.value)}
        options={[
          { value: '', label: 'Select Size' },
          { value: '1-10', label: '1-10' },
          { value: '11-50', label: '11-50' },
          { value: '51-200', label: '51-200' },
          { value: '201-500', label: '201-500' },
          { value: '501-1000', label: '501-1000' },
          { value: '1000+', label: '1000+' },
        ]}
      />

      <AdminTextArea
        label="Reason (required, min 10 characters)"
        value={form.reason}
        onChange={(e) => handleChange('reason', e.target.value)}
        placeholder="e.g. Onboarding requested by sales for TalentCorp Pvt Ltd"
        rows={2}
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {onCancel && <AdminButton type="button" variant="secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</AdminButton>}
        <AdminButton type="submit" isLoading={saving} disabled={!form.email || !form.full_name || !form.gstin} style={{ flex: 2 }}>
          Invite Recruiter
        </AdminButton>
      </div>
    </form>
  );
}
