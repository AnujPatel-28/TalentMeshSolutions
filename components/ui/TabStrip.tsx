"use client";
import React, { useState, useEffect, useRef } from 'react';

interface TabItem {
    key: string;
    label: string;
    count?: number;
}

interface TabStripProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (key: string) => void;
    variant: 'underline' | 'filled-pill';
    maxVisible?: number;
}

export default function TabStrip({ tabs, activeTab, onChange, variant, maxVisible = 5 }: TabStripProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const visibleTabs = tabs.slice(0, maxVisible);
    const overflowTabs = tabs.slice(maxVisible);
    const isCurrentActiveInOverflow = overflowTabs.some(t => t.key === activeTab);
    const activeOverflowTab = overflowTabs.find(t => t.key === activeTab);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', width: 'fit-content' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: variant === 'filled-pill' ? '8px' : '32px',
                borderBottom: variant === 'underline' ? '1px solid var(--tm-border)' : 'none',
                paddingBottom: variant === 'underline' ? '0' : '0',
                width: '100%'
            }}>
                {visibleTabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    if (variant === 'underline') {
                        return (
                            <button
                                key={tab.key}
                                onClick={() => onChange(tab.key)}
                                style={{
                                    padding: '0 0 12px 0',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    borderBottom: `2px solid ${isActive ? 'var(--tm-accent)' : 'transparent'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    outline: 'none',
                                    transition: 'border-color 0.15s ease'
                                }}
                            >
                                {tab.count !== undefined && (
                                    <span style={{ fontSize: '18px', fontWeight: 700, color: isActive ? 'var(--tm-text-primary)' : 'var(--tm-text-secondary)' }}>
                                        {tab.count}
                                    </span>
                                )}
                                <span style={{ fontSize: '13px', fontWeight: 500, color: isActive ? 'var(--tm-text-primary)' : 'var(--tm-text-secondary)' }}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    } else {
                        // filled-pill
                        return (
                            <button
                                key={tab.key}
                                onClick={() => onChange(tab.key)}
                                style={{
                                    border: 'none',
                                    background: isActive ? '#1E2229' : 'transparent',
                                    color: isActive ? 'var(--white)' : 'var(--tm-text-secondary)',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: isActive ? 600 : 500,
                                    outline: 'none',
                                    transition: 'background-color 0.15s ease, color 0.15s ease'
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    }
                })}

                {/* Overflow trigger */}
                {overflowTabs.length > 0 && (
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        {variant === 'underline' ? (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                style={{
                                    padding: '0 0 12px 0',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    borderBottom: `2px solid ${isCurrentActiveInOverflow ? 'var(--tm-accent)' : 'transparent'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    outline: 'none'
                                }}
                            >
                                {isCurrentActiveInOverflow && activeOverflowTab?.count !== undefined && (
                                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tm-text-primary)' }}>
                                        {activeOverflowTab.count}
                                    </span>
                                )}
                                <span style={{ fontSize: '13px', fontWeight: 500, color: isCurrentActiveInOverflow ? 'var(--tm-text-primary)' : 'var(--tm-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isCurrentActiveInOverflow ? activeOverflowTab?.label : 'More'} ▾
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                style={{
                                    border: 'none',
                                    background: isCurrentActiveInOverflow ? '#1E2229' : 'transparent',
                                    color: isCurrentActiveInOverflow ? 'var(--white)' : 'var(--tm-text-secondary)',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: isCurrentActiveInOverflow ? 600 : 500,
                                    outline: 'none'
                                }}
                            >
                                {isCurrentActiveInOverflow ? activeOverflowTab?.label : 'More'} ▾
                            </button>
                        )}

                        {isOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                background: 'var(--white)',
                                border: '1px solid var(--tm-border)',
                                borderRadius: '8px',
                                padding: '4px',
                                minWidth: '160px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {overflowTabs.map(tab => {
                                    const isActive = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                onChange(tab.key);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                border: 'none',
                                                background: isActive ? 'var(--tm-surface-muted)' : 'transparent',
                                                color: 'var(--tm-text-primary)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                fontSize: '13px',
                                                fontWeight: isActive ? 600 : 500,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%'
                                            }}
                                        >
                                            <span>{tab.label}</span>
                                            {tab.count !== undefined && (
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tm-text-secondary)' }}>
                                                    ({tab.count})
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
