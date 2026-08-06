import React from 'react';

export default function PipelineLoading() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .sk-pulse {
          animation: skeleton-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background-color: #e2e8f0;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
        <div className="sk-pulse" style={{ width: 180, height: 24, borderRadius: 6 }} />
        <div className="sk-pulse" style={{ width: 300, height: 14, borderRadius: 4, marginTop: 8 }} />
      </div>

      {/* Kanban columns (8 columns matching STAGES) */}
      <div style={{ display: 'flex', gap: '12px', padding: '1.25rem', overflowX: 'auto', minHeight: 'calc(100vh - 100px)' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(col => (
          <div key={col} style={{ width: 240, minWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Column header */}
            <div style={{ padding: '10px 14px', borderRadius: '10px 10px 0 0', borderBottom: '2px solid #e2e8f0', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="sk-pulse" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="sk-pulse" style={{ width: 24, height: 20, borderRadius: 10 }} />
            </div>

            {/* Column body with candidate cards */}
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '0 0 10px 10px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
              {Array.from({ length: col <= 3 ? 3 : col <= 5 ? 2 : 1 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="sk-pulse" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="sk-pulse" style={{ width: '80%', height: 13, borderRadius: 4 }} />
                      <div className="sk-pulse" style={{ width: '55%', height: 10, borderRadius: 4, marginTop: 5 }} />
                    </div>
                  </div>
                  <div className="sk-pulse" style={{ width: '70%', height: 10, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
