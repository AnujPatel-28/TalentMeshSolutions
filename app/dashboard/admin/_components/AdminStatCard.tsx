import React from 'react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  color?: 'primary' | 'indigo' | 'emerald' | 'rose' | 'amber';
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

const colorMap = {
  primary: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe', activeBorder: '#2563eb', activeShadow: '0 0 0 4px #eff6ff' },
  indigo: { bg: '#eef2ff', text: '#4f46e5', border: '#e0e7ff', activeBorder: '#4f46e5', activeShadow: '0 0 0 4px #eef2ff' },
  emerald: { bg: '#ecfdf5', text: '#059669', border: '#d1fae5', activeBorder: '#059669', activeShadow: '0 0 0 4px #ecfdf5' },
  rose: { bg: '#fff1f2', text: '#e11d48', border: '#ffe4e6', activeBorder: '#e11d48', activeShadow: '0 0 0 4px #fff1f2' },
  amber: { bg: '#fffbeb', text: '#d97706', border: '#fef3c7', activeBorder: '#d97706', activeShadow: '0 0 0 4px #fffbeb' }
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  color = 'primary',
  icon,
  onClick,
  isActive
}) => {
  const styles = colorMap[color];
  return (
    <div 
      onClick={onClick}
      style={{
        padding: '24px',
        borderRadius: '20px',
        backgroundColor: '#fff',
        border: `2px solid ${isActive ? styles.activeBorder : styles.border}`,
        boxShadow: isActive ? styles.activeShadow : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: isActive ? 'translateY(-2px)' : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
        {icon && (
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            backgroundColor: styles.bg, 
            color: styles.text,
            display: 'grid', 
            placeItems: 'center' 
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
};
