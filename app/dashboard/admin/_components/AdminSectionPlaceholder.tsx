import React from 'react';

interface AdminSectionPlaceholderProps {
  title: string;
  description?: string;
}

export default function AdminSectionPlaceholder({ title, description }: AdminSectionPlaceholderProps) {
  return (
    <div style={{
      padding: '80px 40px',
      textAlign: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: '24px',
      border: '2px dashed #e2e8f0',
      marginTop: '20px'
    }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: '50%', 
        backgroundColor: '#fff', 
        display: 'grid', 
        placeItems: 'center', 
        margin: '0 auto 24px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>{title}</h2>
      {description && <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>{description}</p>}
      <div style={{ marginTop: '32px' }}>
        <button style={{
          padding: '10px 20px',
          borderRadius: '10px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          color: '#475569',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          Learn about this feature
        </button>
      </div>
    </div>
  );
}
