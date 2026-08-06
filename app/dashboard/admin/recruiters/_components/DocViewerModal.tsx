'use client';

import { Globe, Download, FileText, ShieldAlert } from 'lucide-react';

export type DocViewerState = {
  isOpen: boolean;
  title: string;
  filename: string;
  url: string;
  blobUrl?: string;
  mimeType?: string;
  loading: boolean;
  error?: string;
};

export default function DocViewerModal({
  docViewer,
  onClose,
  onDownload,
}: {
  docViewer: DocViewerState;
  onClose: () => void;
  onDownload: (url: string, filename: string) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{docViewer.title}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>{docViewer.filename}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {docViewer.blobUrl && (
              <>
                <button
                  type="button"
                  onClick={() => window.open(docViewer.blobUrl, '_blank')}
                  style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Globe size={14} /> Open in Tab
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(docViewer.url, docViewer.filename)}
                  style={{ padding: '6px 12px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} /> Download
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px' }}>
          {docViewer.loading ? (
            <div style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Loading secure verification document...</p>
            </div>
          ) : docViewer.error ? (
            <div style={{ color: '#ef4444', textAlign: 'center', background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <ShieldAlert size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.8 }} />
              <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>{docViewer.error}</p>
              <button
                type="button"
                onClick={() => window.open(docViewer.url, '_blank')}
                style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Open Direct URL
              </button>
            </div>
          ) : docViewer.blobUrl ? (
            docViewer.mimeType?.startsWith('image/') ? (
              <img
                src={docViewer.blobUrl}
                alt={docViewer.title}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
              />
            ) : (
              <object data={docViewer.blobUrl} type="application/pdf" width="100%" height="600px" style={{ borderRadius: '8px', background: 'white' }}>
                <iframe src={docViewer.blobUrl} width="100%" height="600px" title={docViewer.title} style={{ border: 'none', borderRadius: '8px', background: 'white' }} />
              </object>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
