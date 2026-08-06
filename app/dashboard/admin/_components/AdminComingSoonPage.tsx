'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Mail, Clock, ShieldCheck, Rocket } from 'lucide-react';

interface AdminComingSoonPageProps {
  title: string;
  category?: string;
  description: string;
  icon?: React.ReactNode;
  eta?: string;
  highlights?: string[];
}

export default function AdminComingSoonPage({
  title,
  category = 'Under Development',
  description,
  icon,
  eta = 'Launching Soon',
  highlights = []
}: AdminComingSoonPageProps) {
  return (
    <div style={{
      padding: '2.5rem 1.5rem',
      maxWidth: '1200px',
      margin: '0 auto',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      {/* Top Banner / Header Container */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '3.5rem 2.5rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        {/* Ambient Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Feature Category Tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '6px 16px', borderRadius: '100px', marginBottom: '1.5rem' }}>
          <Sparkles size={14} style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: '#c7d2fe', textTransform: 'uppercase' }}>{category}</span>
        </div>

        {/* Feature Icon Header */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
          color: '#ffffff'
        }}>
          {icon || <Rocket size={34} />}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          margin: '0 0 1rem 0',
          color: '#f8fafc'
        }}>
          {title} <span style={{ background: 'linear-gradient(135deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>is Coming Soon</span>
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '1.1rem',
          color: '#94a3b8',
          maxWidth: '680px',
          margin: '0 auto 2rem',
          lineHeight: '1.7'
        }}>
          {description}
        </p>

        {/* ETA Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '8px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '2.5rem' }}>
          <Clock size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>Estimated Release: <strong style={{ color: '#38bdf8' }}>{eta}</strong></span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.15)'
            }}
          >
            <ArrowLeft size={16} /> Return to Admin Overview
          </Link>
          <a
            href="mailto:info@talentmeshsolutions.com?subject=Inquiry%20about%20"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none'
            }}
          >
            <Mail size={16} /> Request Early Access
          </a>
        </div>
      </div>

      {/* Highlights Grid */}
      {highlights.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem', textAlign: 'center' }}>
            What to Expect in this Module
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {highlights.map((feat, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <ShieldCheck size={16} />
                </div>
                <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600, lineHeight: 1.5 }}>
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
