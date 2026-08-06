"use client";
import React from 'react';

export function OpsSidebarSkeleton({ label = 'Loading Recruiter Dashboard...' }: { label?: string }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', width: '100vw', fontFamily: 'sans-serif' }}>
            {/* Sidebar */}
            <aside style={{ width: 180, background: '#12151A', display: 'flex', flexDirection: 'column', padding: '1rem 0', flexShrink: 0 }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', marginBottom: '2rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ width: 80, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
                </div>
                {/* Nav Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
                            <div style={{ width: i === 1 ? 60 : i === 2 ? 80 : 70, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.1)' }} />
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Topbar */}
                <header style={{ height: 56, background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
                    <div style={{ width: 150, height: 16, borderRadius: 4, background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0' }} />
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0' }} />
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0' }} />
                    </div>
                </header>

                {/* Content Body */}
                <main style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Status label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#007BFF' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ width: 60, height: 10, borderRadius: 3, background: '#e2e8f0' }} />
                                <div style={{ width: 100, height: 20, borderRadius: 4, background: '#e2e8f0' }} />
                            </div>
                        ))}
                    </div>

                    {/* Table skeleton */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ width: 120, height: 14, borderRadius: 4, background: '#e2e8f0' }} />
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                                        <div style={{ width: '40%', height: 10, borderRadius: 3, background: '#e2e8f0' }} />
                                        <div style={{ width: '25%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                                    </div>
                                </div>
                                <div style={{ width: 60, height: 20, borderRadius: 10, background: '#e2e8f0' }} />
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export function CandidateTopNavSkeleton({ label = 'Loading Candidate Dashboard...' }: { label?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', width: '100vw', fontFamily: 'sans-serif' }}>
            <style>{`
                @keyframes skeleton-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .4; }
                }
                .sk-pulse {
                    animation: skeleton-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    background-color: #e2e8f0;
                }
            `}</style>

            {/* Top Header */}
            <header style={{ height: 64, background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flex: 1 }}>
                    {/* Brand Logo Placeholder */}
                    <div className="sk-pulse" style={{ width: 120, height: 32, borderRadius: 6 }} />

                    {/* Centered navigation tabs */}
                    <div style={{ display: 'flex', gap: '2rem', margin: '0 auto' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="sk-pulse" style={{ width: i === 1 ? 50 : i === 2 ? 110 : i === 3 ? 80 : 60, height: 16, borderRadius: 4 }} />
                        ))}
                    </div>
                </div>
                {/* Right Section */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                    <div className="sk-pulse" style={{ width: 22, height: 22, borderRadius: 4 }} />
                    <div className="sk-pulse" style={{ width: 22, height: 22, borderRadius: 4 }} />
                    <div className="sk-pulse" style={{ width: 22, height: 22, borderRadius: 4 }} />
                    <div className="sk-pulse" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                </div>
            </header>

            {/* 3-Column Content Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100vw' }}>

                {/* Column 1: Left Profile Sidebar (250px) */}
                <div style={{ width: 250, borderRight: '1px solid #e2e8f0', background: '#f8fafc', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div className="sk-pulse" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                        <div className="sk-pulse" style={{ width: 100, height: 16, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 140, height: 12, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 80, height: 12, borderRadius: 4 }} />
                        <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div className="sk-pulse" style={{ width: 50, height: 10, borderRadius: 3 }} />
                                <div className="sk-pulse" style={{ width: 24, height: 10, borderRadius: 3 }} />
                            </div>
                            <div className="sk-pulse" style={{ width: '100%', height: 4, borderRadius: 9999 }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="sk-pulse" style={{ width: '100%', height: 38, borderRadius: 8 }} />
                        ))}
                    </div>
                </div>

                {/* Column 2: Center Column welcome + list (440px) */}
                <div style={{ width: 440, borderRight: '1px solid #e2e8f0', background: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                    {/* Search bar placeholder */}
                    <div className="sk-pulse" style={{ width: '100%', height: 48, borderRadius: 9999 }} />

                    {/* Welcome message placeholder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 220, height: 13, borderRadius: 4 }} />
                    </div>

                    {/* Status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#007BFF' }} className="sk-pulse" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
                    </div>

                    {/* Job Cards Placeholders */}
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="sk-pulse" style={{ width: 70, height: 18, borderRadius: 4 }} />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                    <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                </div>
                            </div>
                            <div className="sk-pulse" style={{ width: '80%', height: 16, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '50%', height: 12, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '60%', height: 12, borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div className="sk-pulse" style={{ width: 60, height: 18, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: 80, height: 18, borderRadius: 4 }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Column 3: Right Column details panel (flex 1) */}
                <div style={{ flex: 1, background: '#ffffff', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: 680 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="sk-pulse" style={{ width: '70%', height: 26, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '40%', height: 16, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '30%', height: 14, borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <div className="sk-pulse" style={{ width: 200, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                            </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '100%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '95%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '40%', height: 14, borderRadius: 4 }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
