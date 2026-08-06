import React from 'react';

export default function CompanyReviewsLoading() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .sk-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
          background-color: #e2e8f0;
        }
      `}</style>

      {/* Dark Hero Band */}
      <div style={{
        background: 'linear-gradient(135deg, #12263A 0%, #1e3a5f 60%, #12263A 100%)',
        padding: '3.5rem 2rem 6.5rem',
        textAlign: 'center',
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div className="sk-pulse" style={{ width: '320px', height: '34px', borderRadius: '6px', marginBottom: '8px' }} />
        <div className="sk-pulse" style={{ width: '240px', height: '14px', borderRadius: '4px', marginBottom: '16px' }} />
        <div className="sk-pulse" style={{ width: '120px', height: '36px', borderRadius: '9999px' }} />

        {/* Search card placeholder */}
        <div style={{
          position: 'absolute',
          bottom: '-24px',
          width: 'calc(100% - 4rem)',
          maxWidth: '640px',
          background: '#ffffff',
          border: '1px solid #CBD2DB',
          borderRadius: '9999px',
          padding: '4px 4px 4px 18px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          height: '48px',
          boxSizing: 'border-box'
        }}>
          <div className="sk-pulse" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
          <div className="sk-pulse" style={{ flex: 1, height: '16px', borderRadius: '4px' }} />
          <div className="sk-pulse" style={{ width: '140px', height: '40px', borderRadius: '9999px' }} />
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: '960px', margin: '4.5rem auto 3rem', padding: '0 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="sk-pulse" style={{ width: '180px', height: '14px', borderRadius: '4px' }} />
        </div>
        <div className="sk-pulse" style={{ width: '150px', height: '22px', borderRadius: '4px', marginBottom: '1.25rem' }} />

        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="sk-pulse" style={{ width: '46px', height: '46px', borderRadius: '10px' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="sk-pulse" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '40%', height: '10px', borderRadius: '3px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="sk-pulse" style={{ width: '40px', height: '14px', borderRadius: '3px' }} />
                <div className="sk-pulse" style={{ width: '100px', height: '14px', borderRadius: '3px' }} />
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <div className="sk-pulse" style={{ width: '80%', height: '12px', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
