import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    illustrationType?: 'notifications' | 'messages' | 'applications' | 'saved-jobs';
}

export default function EmptyState({ title, description, actionLabel, onAction, illustrationType = 'notifications' }: EmptyStateProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', maxWidth: '440px', margin: '0 auto' }}>
            {/* Small flat illustration (~120px) */}
            <div style={{ width: 120, height: 120, background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid #f1f5f9', position: 'relative' }}>
                {illustrationType === 'notifications' && (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                )}
                {illustrationType === 'messages' && (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                )}
                {illustrationType === 'applications' && (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                )}
                {illustrationType === 'saved-jobs' && (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                )}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem', fontFamily: 'sans-serif' }}>{title}</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5, fontFamily: 'sans-serif' }}>{description}</p>
            {actionLabel && onAction && (
                <button 
                    onClick={onAction}
                    style={{ 
                        background: '#2563eb', 
                        color: '#ffffff', 
                        border: 'none', 
                        padding: '0.625rem 1.5rem', 
                        borderRadius: '8px', 
                        fontSize: '0.875rem', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        fontFamily: 'inherit'
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
