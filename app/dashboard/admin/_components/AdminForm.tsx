import React, { useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  listOptions?: string[];
}

export const AdminInput: React.FC<AdminInputProps> = ({ label, listOptions, ...props }) => {
  const datalistId = listOptions ? `datalist-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined;
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{label}</label>
      <input
        {...props}
        list={datalistId}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'border-color 0.2s',
          ...props.style
        }}
      />
      {listOptions && datalistId && (
        <datalist id={datalistId}>
          {listOptions.map((opt, i) => (
            <option key={i} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  );
};

export const AdminPasswordInput: React.FC<AdminInputProps> = ({ label, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          style={{
            width: '100%',
            padding: '12px 44px 12px 16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
            ...props.style
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            transition: 'color 0.2s',
          }}
          title={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            /* Eye-off icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Eye icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

interface AdminSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (e: any) => void;
}

export const AdminSelect: React.FC<AdminSelectProps> = ({ label, options, value, onChange, ...props }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{label}</label>
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      required={props.required}
      disabled={props.disabled}
      style={props.style}
    />
  </div>
);

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const AdminButton: React.FC<AdminButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  ...props 
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'secondary': return { bg: '#f1f5f9', text: '#475569', border: '1px solid #e2e8f0' };
      case 'danger': return { bg: '#ef4444', text: '#fff', border: 'none' };
      default: return { bg: '#2563eb', text: '#fff', border: 'none' };
    }
  };
  const styles = getStyles();

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      style={{
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: (isLoading || props.disabled) ? 'not-allowed' : 'pointer',
        backgroundColor: styles.bg,
        color: styles.text,
        border: styles.border,
        opacity: (isLoading || props.disabled) ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        ...props.style
      }}
    >
      {isLoading && <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
      {children}
    </button>
  );
};

interface AdminTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const AdminTextArea: React.FC<AdminTextAreaProps> = ({ label, ...props }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{label}</label>
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        minHeight: '100px',
        resize: 'vertical',
        ...props.style
      }}
    />
  </div>
);
