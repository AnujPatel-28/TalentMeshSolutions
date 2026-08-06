'use client';
import React, { useState } from 'react';
import styles from './AlertModal.module.css';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface JobAlert {
  id?: string;
  candidate_id?: string;
  keywords: string | null;
  location: string | null;
  job_type: string[] | null;
  skills: string[] | null;
  salary_min: number | null;
  experience_level: string | null;
  frequency: 'instant' | 'daily' | 'weekly';
  is_active: boolean;
  label: string | null;
}

const IC = {
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function AlertModal({ alert, onClose, onSave }: { alert: Partial<JobAlert>, onClose: () => void, onSave: (data: Partial<JobAlert>) => void }) {
  const [formData, setFormData] = useState<Partial<JobAlert>>(alert);
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      const newSkills = [...(formData.skills || []), skillInput.trim()];
      setFormData({ ...formData, skills: Array.from(new Set(newSkills)) });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills?.filter(s => s !== skill) });
  };

  const toggleJobType = (type: string) => {
    const current = formData.job_type || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setFormData({ ...formData, job_type: next });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{alert.id ? 'Edit Job Alert' : 'Create Job Alert'}</h2>
          <button className={styles.closeBtn} onClick={onClose}><IC.X /></button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Alert Name (Optional)</label>
            <input 
              className={styles.input} 
              placeholder="e.g. Senior React Developer roles"
              value={formData.label || ''}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Keywords</label>
            <input 
              className={styles.input} 
              placeholder="Job title, skills, or company"
              value={formData.keywords || ''}
              onChange={e => setFormData({ ...formData, keywords: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Location</label>
            <input 
              className={styles.input} 
              placeholder="City, state, or 'Remote'"
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Job Type</label>
            <div className={styles.checkboxGrid}>
              {['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'].map(type => (
                <label key={type} className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={formData.job_type?.includes(type)}
                    onChange={() => toggleJobType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Skills</label>
            <div className={styles.tagInputWrapper}>
              {formData.skills?.map(skill => (
                <span key={skill} className={styles.tag}>
                  {skill}
                  <span className={styles.removeTag} onClick={() => removeSkill(skill)}><IC.X /></span>
                </span>
              ))}
              <input 
                className={styles.tagInput}
                placeholder="Type skill + Enter"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Minimum Salary (per annum)</label>
            <input 
              type="range" 
              min="300000" 
              max="5000000" 
              step="100000"
              value={formData.salary_min || 500000}
              onChange={e => setFormData({ ...formData, salary_min: parseInt(e.target.value) })}
            />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2563eb' }}>
              ₹{(formData.salary_min || 500000) / 100000} Lakhs
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Experience Level</label>
            <CustomSelect
              name="experience_level"
              value={formData.experience_level || ''}
              onChange={e => setFormData({ ...formData, experience_level: e.target.value })}
              options={[
                { label: 'Fresher (0-1yr)', value: 'entry' },
                { label: 'Junior (1-3yr)', value: 'junior' },
                { label: 'Mid (3-5yr)', value: 'mid' },
                { label: 'Senior (5+yr)', value: 'senior' }
              ]}
              placeholder="Any Experience"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Alert Frequency</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { id: 'instant', label: '⚡ Instant', hint: 'Get notified as soon as a matching job is posted' },
                { id: 'daily', label: '📅 Daily', hint: 'One email every morning with new matches' },
                { id: 'weekly', label: '📆 Weekly', hint: 'A weekly roundup every Monday' }
              ].map(freq => (
                <label key={freq.id} style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="frequency" 
                    checked={formData.frequency === freq.id}
                    onChange={() => setFormData({ ...formData, frequency: freq.id as any })}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{freq.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{freq.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalFoot}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={() => onSave(formData)}>Save Alert</button>
        </div>
      </div>
    </div>
  );
}
