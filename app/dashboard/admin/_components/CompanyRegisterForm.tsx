"use client";

import { useState } from 'react';
import { invokeFunction, insforge } from '@/lib/insforge';
import { AdminInput, AdminButton, AdminSelect, AdminTextArea } from './AdminForm';

// Doc 14 R-6 — mirrors admin-companies edge fn's GSTIN/CIN patterns.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CIN_RE = /^[ULF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

interface CompanyRegisterFormProps {
  onSuccess?: (company: any) => void;
  onCancel?: () => void;
}

export function CompanyRegisterForm({ onSuccess, onCancel }: CompanyRegisterFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    cin: '',
    website: '',
    industry: '',
    size: '',
    location: '',
    description: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!GSTIN_RE.test(formData.gstin.trim().toUpperCase())) {
      setError('A valid GSTIN is required (e.g. 27AAPFU0939F1ZV).');
      return;
    }
    if (formData.cin.trim() && !CIN_RE.test(formData.cin.trim().toUpperCase())) {
      setError('CIN format is invalid (e.g. U72900MH2018PTC123456).');
      return;
    }

    setSaving(true);
    try {
      let logo_url = null;

      if (logoFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('company-logos')
          .uploadAuto(logoFile);

        if (uploadError) throw new Error('Logo upload failed: ' + uploadError.message);
        logo_url = uploadData?.key || null;
      }

      const { data, error } = await invokeFunction('admin-companies', {
        method: 'POST',
        body: {
          ...formData,
          gstin: formData.gstin.trim().toUpperCase(),
          cin: formData.cin.trim() ? formData.cin.trim().toUpperCase() : undefined,
          website: formData.website.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          location: formData.location.trim() || undefined,
          description: formData.description.trim() || undefined,
          logo_url,
        },
      });

      if (error) {
        // invokeFunction's error normalization only keeps { message, status, details } — the
        // edge fn's `code`/`existing_company_id` fields on a 409 don't reach the client, so this
        // can only detect the conflict, not offer an attach-to-existing-company shortcut.
        if ((error as any).status === 409) {
          setError('A company with this GSTIN already exists.');
          return;
        }
        throw new Error(error.message);
      }

      setSuccess('Company identity established successfully.');
      if (onSuccess) {
        setTimeout(() => onSuccess(data.company), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fee2e2' }}>{error}</div>}
      {success && <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #d1fae5' }}>{success}</div>}

      <AdminInput
        label="Legal Company Name"
        value={formData.name}
        onChange={e => handleInputChange('name', e.target.value)}
        required
        placeholder="e.g. TalentMesh Global"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <AdminInput
          label="GSTIN"
          value={formData.gstin}
          onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())}
          required
          placeholder="e.g. 27AAPFU0939F1ZV"
          maxLength={15}
        />
        <AdminInput
          label="CIN (optional)"
          value={formData.cin}
          onChange={e => handleInputChange('cin', e.target.value.toUpperCase())}
          placeholder="e.g. U72900MH2018PTC123456"
          maxLength={21}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <AdminInput
          label="Corporate Website"
          value={formData.website}
          onChange={e => handleInputChange('website', e.target.value)}
          placeholder="https://example.com"
        />
        <AdminInput
          label="Location"
          value={formData.location}
          onChange={e => handleInputChange('location', e.target.value)}
          placeholder="City, Country"
          listOptions={[
            'Remote',
            'Bangalore, India',
            'Mumbai, India',
            'Delhi NCR, India',
            'Hyderabad, India',
            'Pune, India',
            'Chennai, India',
            'San Francisco, CA',
            'New York, NY',
            'London, UK',
            'Singapore'
          ]}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <AdminSelect
          label="Industry"
          value={formData.industry}
          onChange={e => handleInputChange('industry', e.target.value)}
          options={[
            { value: '', label: 'Select Industry' },
            { value: 'Technology', label: 'Technology' },
            { value: 'Healthcare', label: 'Healthcare' },
            { value: 'Finance', label: 'Finance' },
            { value: 'Other', label: 'Other' },
          ]}
        />
        <AdminSelect
          label="Size"
          value={formData.size}
          onChange={e => handleInputChange('size', e.target.value)}
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
      </div>

      <AdminTextArea
        label="Description"
        value={formData.description}
        onChange={e => handleInputChange('description', e.target.value)}
        placeholder="Brief mission statement..."
        rows={3}
      />

      <div style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
        <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        {logoPreview ? (
          <img src={logoPreview} style={{ height: '40px', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Click to upload logo</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {onCancel && <AdminButton type="button" variant="secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</AdminButton>}
        <AdminButton type="submit" isLoading={saving} disabled={!formData.name} style={{ flex: 2 }}>Register Company</AdminButton>
      </div>
    </form>
  );
}
