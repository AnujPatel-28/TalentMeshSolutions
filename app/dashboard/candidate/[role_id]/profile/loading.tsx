import React from 'react';

export default function ProfileLoading() {
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

      <div style={{ maxWidth: '640px', margin: '2.5rem auto', padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Block: Name and Avatar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="sk-pulse" style={{ width: '60%', height: '28px', borderRadius: '6px' }} />
          </div>
          <div className="sk-pulse" style={{ width: '52px', height: '52px', borderRadius: '50%' }} />
        </div>

        {/* Contact Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid #e2e5ea', paddingBottom: '20px' }}>
          <div className="sk-pulse" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
          <div className="sk-pulse" style={{ width: '50%', height: '14px', borderRadius: '4px' }} />
          <div className="sk-pulse" style={{ width: '35%', height: '14px', borderRadius: '4px' }} />
        </div>

        {/* Status banner */}
        <div className="sk-pulse" style={{ width: '100%', height: '48px', borderRadius: '8px' }} />

        {/* Resumes Section Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="sk-pulse" style={{ width: '120px', height: '18px', borderRadius: '4px' }} />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="sk-pulse" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="sk-pulse" style={{ width: '80%', height: '14px', borderRadius: '4px' }} />
              <div className="sk-pulse" style={{ width: '40%', height: '10px', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Job Preferences Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="sk-pulse" style={{ width: '140px', height: '18px', borderRadius: '4px' }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="sk-pulse" style={{ width: '100px', height: '10px', borderRadius: '3px' }} />
                <div className="sk-pulse" style={{ width: '200px', height: '14px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
