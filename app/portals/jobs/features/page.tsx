"use client";
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui';
import { Marquee } from '@/components/ui';
import { PremiumCardGrid } from '@/components/ui';
import { SuperhumanPowers, CTA } from '@/components/sections';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AdsClickOutlinedIcon from '@mui/icons-material/AdsClickOutlined';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import HeroBg from '@/components/ui/HeroBg/HeroBg';

const INTEGRATIONS = [
    {
        name: 'Slack',
        color: '#4A154B',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.782a2.528 2.528 0 0 1-2.52-2.522V8.824a2.528 2.528 0 0 1 2.52-2.52h5.041zm10.135 3.761a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.782a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.042zm-3.781 10.135a2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522a2.528 2.528 0 0 1 2.52 2.52zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z"/>
            </svg>
        )
    },
    {
        name: 'Jira',
        color: '#0052CC',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2C6.81 2 3 5.81 3 10.53V22h10.47C18.19 22 22 18.19 22 13.47V2H11.53zm5.66 11.57l-4.52 4.53c-.39.39-1.02.39-1.41 0l-1.57-1.58c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0l.87.87 3.81-3.81c.39-.39 1.02-.39 1.41 0s.39 1.03 0 1.4z"/>
            </svg>
        )
    },
    {
        name: 'Notion',
        color: '#000000',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.6 2h14.8c1.4 0 2.6 1.2 2.6 2.6v14.8c0 1.4-1.2 2.6-2.6 2.6H4.6C3.2 22 2 20.8 2 19.4V4.6C2 3.2 3.2 2 4.6 2zm4.1 4.5c-.3 0-.6.1-.8.4L5.6 9.6v7.8c0 .3.2.6.5.6h1.2c.3 0 .5-.3.5-.6v-5.2l3.4 5.5c.2.3.4.4.7.4h1c.3 0 .5-.2.5-.5V9.3l-3.3-5.2c-.2-.3-.4-.4-.7-.4H8.7zm7.5.3c-.4 0-.8.3-.8.8v6.7c0 .4.4.8.8.8h1.2c.4 0 .8-.4.8-.8V8.1c0-.4-.3-.8-.8-.8h-1.2z"/>
            </svg>
        )
    },
    {
        name: 'Google Calendar',
        color: '#4285F4',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7h-5v5h5v-5z"/>
            </svg>
        )
    },
    {
        name: 'Greenhouse',
        color: '#00B259',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9L12 2zm4.8 14H7.2v-1.5h9.6V16zm0-3H7.2v-1.5h9.6V13zm0-3H7.2V8.5h9.6V10z"/>
            </svg>
        )
    },
    {
        name: 'Lever',
        color: '#00A499',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 3h20v4H2zm3 6h14v12H5zm4 3h6v2H9z"/>
            </svg>
        )
    },
    {
        name: 'Workday',
        color: '#005CB9',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
        )
    },
    {
        name: 'Microsoft Teams',
        color: '#6264A7',
        logo: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12s4.48-10 10-10zm2.5 5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5S15.33 7 14.5 7zm-5 0c-.83 0-1.5.67-1.5 1.5S8.67 10 9.5 10s1.5-.67 1.5-1.5S10.33 7 9.5 7zm5 4.5c-1.38 0-2.5 1.12-2.5 2.5H17c0-1.38-1.12-2.5-2.5-2.5zm-5 0c-1.38 0-2.5 1.12-2.5 2.5h5c0-1.38-1.12-2.5-2.5-2.5z"/>
            </svg>
        )
    }
];

export default function FeaturesPage() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <main style={{ background: 'transparent' }}>
            <HeroBg src="/wave-bg.png" fixed />
            
            <PageHeader
                title="Engineered for"
                highlight="performance"
                description="Explore the advanced AI infrastructure that makes TalentMesh the fastest recruitment platform."
                breadcrumb="Platform Features"
                bgImage="/ChatGPT Image Jun 17, 2026, 08_03_00 PM (1).png"
            />

            <AnimateOnScroll animation="fadeUp">
                <Marquee />
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp" delay={100}>
                <SuperhumanPowers />
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeLeft">
                <section className="premium-section">
                    <div className="premium-container premium-grid-2" style={{ alignItems: 'center' }}>
                        <div>
                            <span style={{ color: 'var(--primary-blue)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>Neural Infrastructure</span>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--deep-navy)', margin: '1.5rem 0' }}>The Aura AI Engine</h2>
                            <p style={{ color: 'var(--medium-grey)', fontSize: '1.125rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
                                Unlike traditional keyword matching, Aura uses a multi-dimensional neural network to understand semantic relationships.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {[
                                    { icon: <PsychologyOutlinedIcon sx={{ color: 'var(--primary-blue)' }} />, title: "Semantic Analysis", text: "Identifies that a 'Product Engineer' might be a better fit than a 'React Developer' for certain roles." },
                                    { icon: <StorageOutlinedIcon sx={{ color: 'var(--primary-blue)' }} />, title: "Contextual Mapping", text: "Maps 50+ data points including past company size, growth stages, and team structures." }
                                ].map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '1.5rem' }}>
                                        <div style={{ flexShrink: 0 }}>{item.icon}</div>
                                        <div>
                                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{item.title}</h4>
                                            <p style={{ color: 'var(--medium-grey)', fontSize: '0.95rem' }}>{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '4rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                                    <PsychologyOutlinedIcon sx={{ fontSize: 64, color: 'var(--primary-blue)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    {[1, 1, 1, 1].map((_, i) => (
                                        <div key={i} style={{ width: '12px', height: '40px', background: 'var(--primary-blue)', borderRadius: '6px', opacity: 1 - (i * 0.2) }}></div>
                                    ))}
                                </div>
                                <p style={{ marginTop: '2rem', fontWeight: 700, color: 'var(--deep-navy)' }}>Real-time Signal Processing</p>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp">
                <section className="premium-section" style={{ background: 'transparent' }}>
                    <div className="premium-container">
                        <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Fits into your workflow.</h2>
                            <p style={{ color: 'var(--medium-grey)', fontSize: '1.25rem', marginTop: '1rem' }}>Seamless integrations with the tools your team already loves.</p>
                        </div>

                        <div className="premium-grid-4">
                            {INTEGRATIONS.map((tool, i) => {
                                const isHovered = hoveredIndex === i;
                                return (
                                    <div 
                                        key={i} 
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        style={{ 
                                            background: 'rgba(255, 255, 255, 0.65)', 
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            padding: '2.5rem', 
                                            borderRadius: 'var(--radius-md)', 
                                            border: isHovered ? `1px solid ${tool.color}` : '1px solid rgba(255,255,255,0.4)', 
                                            textAlign: 'center', 
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                                            cursor: 'pointer',
                                            transform: isHovered ? 'scale(1.05) translateY(-5px)' : 'none',
                                            boxShadow: isHovered ? `0 15px 35px ${tool.color}25` : '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                                            color: isHovered ? tool.color : 'inherit'
                                        }}
                                    >
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            marginBottom: '1.25rem',
                                            color: isHovered ? tool.color : 'var(--primary-blue)',
                                            transition: 'color 0.3s ease'
                                        }}>
                                            {tool.logo}
                                        </div>
                                        <h4 style={{ fontWeight: 800 }}>{tool.name}</h4>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <AnimateOnScroll animation="scaleUp">
                <PremiumCardGrid items={[
                    { icon: <LockOutlinedIcon />, title: "Bank-Grade Security", desc: "Your data is encrypted at rest and in transit with SOC2 Compliance." },
                    { icon: <AccountTreeOutlinedIcon />, title: "Custom Workflows", desc: "Build automated hiring stages that match your specific organizational needs." },
                    { icon: <AdsClickOutlinedIcon />, title: "Bulk Operations", desc: "Manage 1,000+ candidates as easily as you manage one." }
                ]} />
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp">
                <CTA />
            </AnimateOnScroll>
        </main>
    );
}
