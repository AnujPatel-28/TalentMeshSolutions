import React from 'react';
import AnimateOnScroll from '@/components/AnimateOnScroll';

interface SectionHeaderProps {
    tag?: string;
    title: string | React.ReactNode;
    description?: string;
    centered?: boolean;
    light?: boolean;
    className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    tag,
    title,
    description,
    centered = false,
    light = false,
    className = ''
}) => {
    return (
        <AnimateOnScroll animation="fadeUp">
            <div className={`section-header ${centered ? 'centered' : ''} ${className}`} style={{ marginBottom: '4rem' }}>
                {tag && <span className="section-tag">{tag}</span>}
                <h2 className="section-title" style={{ color: light ? '#fff' : 'var(--deep-navy)' }}>
                    {title}
                </h2>
                {description && (
                    <p className={`section-desc ${centered ? 'centered' : ''}`} style={{ color: light ? 'rgba(255,255,255,0.7)' : 'var(--medium-grey)' }}>
                        {description}
                    </p>
                )}
            </div>
        </AnimateOnScroll>
    );
};

export default SectionHeader;
