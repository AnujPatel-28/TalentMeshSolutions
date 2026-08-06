import React from 'react';

export default function ResumesLoading() {
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

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Title */}
        <div className="sk-pulse" style={{ width: '220px', height: '32px', borderRadius: '6px' }} />
        <div className="sk-pulse" style={{ width: '70%', height: '14px', borderRadius: '4px', marginBottom: '1.5rem' }} />

        {/* Resume Items Skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="sk-pulse" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="sk-pulse" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '30%', height: '10px', borderRadius: '3px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div className="sk-pulse" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
                <div className="sk-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
