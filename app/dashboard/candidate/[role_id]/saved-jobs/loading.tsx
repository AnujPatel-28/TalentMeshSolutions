import React from 'react';

export default function SavedJobsLoading() {
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

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Page Title */}
        <div className="sk-pulse" style={{ width: '180px', height: '32px', borderRadius: '6px', marginBottom: '8px' }} />

        {/* Tab Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e5ea', gap: '16px', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div className="sk-pulse" style={{ width: '20px', height: '14px', borderRadius: '3px' }} />
            <div className="sk-pulse" style={{ width: '50px', height: '12px', borderRadius: '3px' }} />
          </div>
        </div>

        {/* List of saved jobs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 0', borderBottom: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                  <div className="sk-pulse" style={{ width: '48px', height: '48px', borderRadius: '4px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="sk-pulse" style={{ width: '45%', height: '16px', borderRadius: '4px' }} />
                    <div className="sk-pulse" style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                    <div className="sk-pulse" style={{ width: '20%', height: '10px', borderRadius: '3px' }} />
                  </div>
                </div>
                <div className="sk-pulse" style={{ width: '80px', height: '32px', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
