"use client";
import React, { useEffect } from 'react';
import styles from './DetailDrawer.module.css';

interface DetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string | React.ReactNode;
    header?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    width?: string;
}

export default function DetailDrawer({
    isOpen,
    onClose,
    title,
    header,
    children,
    footer,
    width
}: DetailDrawerProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div 
                className={styles.overlay} 
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Side panel */}
            <aside 
                className={styles.drawer} 
                style={{ width: width || 'var(--tm-drawer-width, 480px)' }}
                role="dialog"
                aria-modal="true"
            >
                {/* Header Slot */}
                {header !== undefined ? (
                    header
                ) : (
                    <header className={styles.header}>
                        <h2 className={styles.title}>{title || 'Details'}</h2>
                        <button 
                            type="button" 
                            className={styles.closeBtn} 
                            onClick={onClose}
                            aria-label="Close details"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </header>
                )}

                {/* Body/Content Slot */}
                <div className={styles.body}>
                    {children}
                </div>

                {/* Footer Slot */}
                {footer && (
                    <footer className={styles.footer}>
                        {footer}
                    </footer>
                )}
            </aside>
        </>
    );
}
