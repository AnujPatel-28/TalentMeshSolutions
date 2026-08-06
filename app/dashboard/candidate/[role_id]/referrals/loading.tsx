import React from 'react';

export default function ReferralsLoading() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
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

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Page title */}
        <div className="sk-pulse" style={{ width: '240px', height: '32px', borderRadius: '6px' }} />
        <div className="sk-pulse" style={{ width: '85%', height: '14px', borderRadius: '4px', marginBottom: '1rem' }} />

        {/* Tab Strip */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e5ea', gap: '16px', marginBottom: '2rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: '0 24px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div className="sk-pulse" style={{ width: '10px', height: '14px', borderRadius: '3px' }} />
              <div className="sk-pulse" style={{ width: '70px', height: '12px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>

        {/* Empty status container skeleton */}
        <div style={{ padding: '4rem 2rem', border: '1px dashed #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="sk-pulse" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          <div className="sk-pulse" style={{ width: '200px', height: '18px', borderRadius: '4px' }} />
          <div className="sk-pulse" style={{ width: '280px', height: '12px', borderRadius: '3px' }} />
        </div>
      </div>
    </div>
  );
}
