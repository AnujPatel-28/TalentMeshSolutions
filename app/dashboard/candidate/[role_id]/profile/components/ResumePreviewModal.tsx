import React from 'react';
import dynamic from 'next/dynamic';
import styles from '../../../../shared-dashboard.module.css';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  loading: () => <div className={styles.loading}>Loading PDF Preview...</div>,
  ssr: false
});

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string;
}

export default function ResumePreviewModal({ isOpen, onClose, resumeUrl }: ResumePreviewModalProps) {
  if (!isOpen) return null;

  const handleOpenNewTab = () => {
    if (resumeUrl) window.open(resumeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!resumeUrl) return;
    const a = document.createElement('a');
    a.href = resumeUrl;
    a.download = 'resume.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="resume-preview-title"
    >
      <div 
        style={{ 
          maxWidth: '1000px', 
          width: '100%', 
          height: '88vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', background: '#f8fafc', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <h3 id="resume-preview-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Resume Preview
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleOpenNewTab}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="Open in new window for full screen viewing"
            >
              ↗ Open Fullscreen
            </button>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="Download PDF"
            >
              📥 Download
            </button>
            <button 
              type="button" 
              onClick={onClose}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer', 
                color: '#64748b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px'
              }}
              aria-label="Close preview"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable PDF Viewer Container */}
        <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', backgroundColor: '#525659' }}>
          <PdfViewer url={resumeUrl} />
        </div>
      </div>
    </div>
  );
}
