import React from 'react';
import styles from './messages.module.css';

export default function MessagesLoading() {
  return (
    <div className={styles.container} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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

      {/* Sidebar List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader} style={{ padding: '16px 20px', borderBottom: '1px solid #e2e5ea', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="sk-pulse" style={{ width: '100px', height: '24px', borderRadius: '4px' }} />
          <div className="sk-pulse" style={{ width: '100%', height: '36px', borderRadius: '18px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
              <div className="sk-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="sk-pulse" style={{ width: '50%', height: '14px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '20%', height: '10px', borderRadius: '3px' }} />
                </div>
                <div className="sk-pulse" style={{ width: '80%', height: '12px', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={styles.chatArea} style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e5ea', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sk-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div className="sk-pulse" style={{ width: '140px', height: '18px', borderRadius: '4px' }} />
        </div>

        {/* Message body skeleton */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', width: '60%' }}>
            <div className="sk-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
            <div className="sk-pulse" style={{ flex: 1, height: '48px', borderRadius: '12px 12px 12px 0' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end', width: '50%', justifyContent: 'flex-end' }}>
            <div className="sk-pulse" style={{ flex: 1, height: '36px', borderRadius: '12px 12px 0 12px' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', width: '45%' }}>
            <div className="sk-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
            <div className="sk-pulse" style={{ flex: 1, height: '40px', borderRadius: '12px 12px 12px 0' }} />
          </div>
        </div>

        {/* Bottom input area skeleton */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e5ea', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="sk-pulse" style={{ flex: 1, height: '40px', borderRadius: '20px' }} />
          <div className="sk-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  );
}
