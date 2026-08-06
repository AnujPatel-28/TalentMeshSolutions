import React from 'react';

export default function SettingsLoading() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
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

      {/* Sidebar Skeleton */}
      <div style={{ width: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '24px 16px', gap: '20px' }}>
        {/* Title */}
        <div className="sk-pulse" style={{ width: '120px', height: '24px', borderRadius: '6px', margin: '0 8px 10px' }} />

        {/* Tab items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '8px' }}>
              <div className="sk-pulse" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="sk-pulse" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                <div className="sk-pulse" style={{ width: '40%', height: '10px', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div style={{ flex: 1, padding: '3rem 4rem', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div>
            <div className="sk-pulse" style={{ width: '200px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
            <div className="sk-pulse" style={{ width: '380px', height: '14px', borderRadius: '4px' }} />
          </div>

          {/* Cards */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: i === 4 ? 'none' : '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div className="sk-pulse" style={{ width: '100px', height: '12px', borderRadius: '3px' }} />
                  <div className="sk-pulse" style={{ width: '220px', height: '16px', borderRadius: '4px' }} />
                </div>
                <div className="sk-pulse" style={{ width: '100px', height: '32px', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
