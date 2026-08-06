'use client';
import React from 'react';

interface StickyActionBarProps {
  isEditing: boolean;
  candidateName: string;
  completionScore: number;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEditToggle: () => void;
}

export default React.memo(function StickyActionBar({
  isSaving,
  onSave,
  onCancel,
}: StickyActionBarProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', width: '100%', marginTop: '2.5rem', paddingBottom: '1rem' }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          backgroundColor: '#ffffff',
          color: '#475569',
          border: '1px solid #cbd5e1',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          borderRadius: '8px',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit'
        }}
        onMouseOver={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
        onMouseOut={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#ffffff'; }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          backgroundColor: isSaving ? '#60a5fa' : 'var(--primary-blue)',
          color: '#ffffff',
          border: 'none',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          borderRadius: '8px',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
        }}
        onMouseOver={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
        onMouseOut={e => { if (!isSaving) e.currentTarget.style.backgroundColor = 'var(--primary-blue)'; }}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
});
