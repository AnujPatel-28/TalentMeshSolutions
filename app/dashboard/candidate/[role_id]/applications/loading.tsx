import React from 'react';

export default function ApplicationsLoading() {
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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Page Title */}
        <div className="sk-pulse" style={{ width: '150px', height: '32px', borderRadius: '6px', marginBottom: '8px' }} />

        {/* Tab Strip */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e5ea', gap: '16px', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div className="sk-pulse" style={{ width: '20px', height: '14px', borderRadius: '3px' }} />
              <div className="sk-pulse" style={{ width: '60px', height: '12px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>

        {/* Job Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                  <div className="sk-pulse" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="sk-pulse" style={{ width: '40%', height: '16px', borderRadius: '4px' }} />
                    <div className="sk-pulse" style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                    <div className="sk-pulse" style={{ width: '20%', height: '10px', borderRadius: '3px' }} />
                  </div>
                </div>
                <div className="sk-pulse" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="sk-pulse" style={{ width: '120px', height: '12px', borderRadius: '3px' }} />
                <div className="sk-pulse" style={{ width: '150px', height: '32px', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
