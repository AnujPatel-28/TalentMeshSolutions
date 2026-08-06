import React from 'react';

export default function NotificationsLoading() {
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

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="sk-pulse" style={{ width: '180px', height: '32px', borderRadius: '6px' }} />
        </div>

        {/* Notifications List Skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div className="sk-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', marginTop: '6px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="sk-pulse" style={{ width: '30%', height: '14px', borderRadius: '4px' }} />
                <div className="sk-pulse" style={{ width: '75%', height: '12px', borderRadius: '4px' }} />
                <div className="sk-pulse" style={{ width: '20%', height: '10px', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
