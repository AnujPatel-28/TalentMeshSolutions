"use client";
import React from 'react';
import PageHeader from '../PageHeader/PageHeader';
import { CTA } from '../../sections';

interface InfoLayoutProps {
    title: string;
    breadcrumb: string;
    description: string;
    children: React.ReactNode;
}

const InfoLayout: React.FC<InfoLayoutProps> = ({ title, breadcrumb, description, children }) => {
    return (
        <main style={{ background: '#fff' }}>
            <PageHeader
                title={title}
                description={description}
                breadcrumb={breadcrumb}
                highlight="Compliance"
            />
            <div className="premium-container" style={{ padding: '4rem 2rem 8rem' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--medium-grey)', lineHeight: '1.8', fontSize: '1.1rem' }}>
                    {children}
                </div>
            </div>
            <CTA />
        </main>
    );
};

export default InfoLayout;
