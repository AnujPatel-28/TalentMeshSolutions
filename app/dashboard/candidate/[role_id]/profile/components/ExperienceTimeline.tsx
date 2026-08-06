import React, { useState } from 'react';
import styles from '../../../../shared-dashboard.module.css';
import SectionStatus from './SectionStatus';
import type { WorkExperience } from '@/types/user';

const companyColor = (name: string) => {
  if (!name) return '#2563eb';
  const colors = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
    '#0891b2', '#4f46e5', '#e11d48', '#059669', '#d97706'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface ExperienceTimelineProps {
  experience?: WorkExperience[] | null;
  isEditing: boolean;
  onUpdate: (expList: WorkExperience[]) => void;
}

const EMPTY_EXP: WorkExperience = {
  id: '',
  title: '',
  company: '',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: ''
};

export default React.memo(function ExperienceTimeline({
  experience = [],
  isEditing,
  onUpdate
}: ExperienceTimelineProps) {
  
  const expList = experience || [];
  const isComplete = expList.length >= 1;

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WorkExperience>(EMPTY_EXP);
  const [errors, setErrors] = useState<{ title?: string; company?: string }>({});

  const handleOpenAdd = () => {
    setFormState({ ...EMPTY_EXP, id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 11) });
    setEditingId(null);
    setShowForm(true);
    setErrors({});
  };

  const handleOpenEdit = (exp: WorkExperience) => {
    setFormState({ ...exp });
    setEditingId(exp.id);
    setShowForm(true);
    setErrors({});
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormState(EMPTY_EXP);
    setErrors({});
  };

  const handleDelete = (id: string) => {
    const updated = expList.filter(e => e.id !== id);
    onUpdate(updated);
  };

  const handleSave = () => {
    const errs: { title?: string; company?: string } = {};
    if (!formState.title.trim()) errs.title = 'Job Title is required';
    if (!formState.company.trim()) errs.company = 'Company is required';
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let updated: WorkExperience[];
    if (editingId) {
      updated = expList.map(e => e.id === editingId ? formState : e);
    } else {
      updated = [...expList, formState];
    }

    onUpdate(updated);
    setShowForm(false);
    setEditingId(null);
    setFormState(EMPTY_EXP);
    setErrors({});
  };

  const renderForm = () => {
    return (
      <div className={styles.inlineFormCard}>
        <h3 className={styles.inlineFormTitle}>{editingId ? 'Edit Work Experience' : 'New Work Experience'}</h3>
        <div className={styles.formGrid2Col}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Job Title *</label>
            <input 
              className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`}
              value={formState.title} 
              onChange={e => setFormState(p => ({ ...p, title: e.target.value }))} 
              placeholder="e.g. Frontend Developer" 
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Company *</label>
            <input 
              className={`${styles.formInput} ${errors.company ? styles.inputError : ''}`}
              value={formState.company} 
              onChange={e => setFormState(p => ({ ...p, company: e.target.value }))} 
              placeholder="e.g. Google" 
            />
            {errors.company && <span className={styles.errorText}>{errors.company}</span>}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Location</label>
            <input 
              className={styles.formInput}
              value={formState.location || ''} 
              onChange={e => setFormState(p => ({ ...p, location: e.target.value }))} 
              placeholder="e.g. Bangalore, IN" 
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Start Date</label>
            <input 
              type="month" 
              className={styles.formInput}
              value={formState.start_date || ''} 
              onChange={e => setFormState(p => ({ ...p, start_date: e.target.value }))} 
            />
          </div>
          {!formState.is_current && (
            <div className={styles.formField}>
              <label className={styles.formLabel}>End Date</label>
              <input 
                type="month" 
                className={styles.formInput}
                value={formState.end_date || ''} 
                onChange={e => setFormState(p => ({ ...p, end_date: e.target.value }))} 
              />
            </div>
          )}
          <div className={styles.formField} style={{ justifyContent: 'center', paddingTop: '1rem' }}>
            <label className={styles.formCheckboxGroup}>
              <input 
                type="checkbox" 
                checked={!!formState.is_current} 
                onChange={e => setFormState(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))} 
              />
              <span>Currently working here</span>
            </label>
          </div>
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Description / Responsibilities</label>
          <textarea 
            className={styles.formTextarea}
            value={formState.description || ''} 
            onChange={e => setFormState(p => ({ ...p, description: e.target.value }))} 
            placeholder="Describe your role, key achievements, technologies used... (Tip: Use bullet points '•' or '-' to list responsibilities)" 
            rows={3} 
          />
        </div>
        <div className={styles.formActions}>
          <button type="button" onClick={handleCancel} className={styles.cancelBtn}>Cancel</button>
          <button type="button" onClick={handleSave} className={styles.saveBtn}>Save</button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.profileSection} id="experience">
      <div className={styles.timelineCardHeader} style={{ alignItems: 'center' }}>
        <SectionStatus 
          title="Work Experience" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-blue)' }}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} 
          count={expList.length}
          isComplete={isComplete} 
          required={true}
        />
        {isEditing && !showForm && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className={`${styles.emptyStateBtn} ${styles.smallAddBtn}`}
          >
            + Add Experience
          </button>
        )}
      </div>

      {expList.length === 0 && !showForm ? (
        <div className={styles.emptyStateCard}>
          <div className={styles.emptyStateIcon}>💼</div>
          <h3 className={styles.emptyStateTitle}>No Work Experience Added Yet</h3>
          <p className={styles.emptyStateText}>
            Profiles with experience receive 4x more recruiter views. Add your first job.
          </p>
          {isEditing && (
            <button 
              type="button" 
              onClick={handleOpenAdd} 
              className={styles.emptyStateBtn}
            >
              Add Experience
            </button>
          )}
        </div>
      ) : (
        <div className={styles.timelineContainer}>
          {expList.map((exp, index) => (
            editingId === exp.id && showForm ? (
              <React.Fragment key={exp.id}>
                {renderForm()}
              </React.Fragment>
            ) : (
              <div key={exp.id} className={styles.timelineItem}>
                <div className={styles.timelineMarker}>
                  <div className={styles.timelineDot} />
                  {index < expList.length - 1 && <div className={styles.timelineLine} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.viewCard}>
                    <div className={styles.timelineLogoLayout}>
                      <div className={styles.timelineLogo} style={{ background: companyColor(exp.company) }}>
                        {exp.company ? exp.company.charAt(0).toUpperCase() : '💼'}
                      </div>
                      <div className={styles.flex1}>
                        <div className={styles.timelineCardHeader}>
                          <div>
                            <h4 className={styles.timelineTitle}>{exp.title}</h4>
                            <p className={styles.timelineSubHeader}>
                              {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                            </p>
                            <div className={styles.timelineDateRow}>
                              <span className={styles.timelineDateText}>
                                {exp.start_date || 'N/A'} → {exp.is_current ? 'Present' : exp.end_date || 'N/A'}
                              </span>
                              {exp.is_current && <span className={styles.currentJobBadge}>Current</span>}
                            </div>
                          </div>
                          
                          {isEditing && (
                            <div className={styles.actionButtonContainer}>
                              <button 
                                type="button" 
                                onClick={() => handleOpenEdit(exp)} 
                                className={`${styles.iconButton} ${styles.editIconBtn}`} 
                                title="Edit experience"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDelete(exp.id)} 
                                className={`${styles.iconButton} ${styles.deleteIconBtn}`} 
                                title="Delete experience"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {exp.description && (
                          <p className={styles.timelineDescText} style={{ whiteSpace: 'pre-wrap' }}>
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {isEditing && showForm && !editingId && renderForm()}
    </div>
  );
});
