import React from 'react';
import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  eyebrow,
  subtitle,
  breadcrumbs,
  actions
}) => {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {breadcrumbs && (
            <nav style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {crumb.href ? (
                    <Link href={crumb.href} style={{ color: '#64748b', textDecoration: 'none' }}>{crumb.label}</Link>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <span style={{ color: '#cbd5e1' }}>/</span>}
                </React.Fragment>
              ))}
            </nav>
          )}
          {eyebrow && <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.1em', marginBottom: '8px' }}>{eyebrow}</span>}
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ marginTop: '8px', color: '#64748b', fontSize: '1rem' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>}
      </div>
    </div>
  );
};
