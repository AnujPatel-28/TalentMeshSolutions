'use client';
import React, { useState, useRef, useEffect } from 'react';

export interface CustomSelectProps {
  name?: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } } | any) => void;
  options: { label: React.ReactNode; value: string }[] | string[] | readonly string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  style?: React.CSSProperties;
  footer?: React.ReactNode;
  disabled?: boolean;
  dropUp?: boolean;
}

export function CustomSelect({ name, value, onChange, options, placeholder, className, required, style, footer, disabled, dropUp }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedLabel = normalizedOptions.find(o => o.value === value)?.label || placeholder || 'Select...';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        className={className} 
        style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: disabled ? 'not-allowed' : 'pointer', 
          background: disabled ? '#f1f5f9' : '#f8fafc', 
          width: '100%', 
          opacity: disabled ? 0.6 : 1,
          ...(!className ? {
            padding: '10px 12px',
            borderRadius: '8px',
            border: isOpen ? '1px solid #2563eb' : '1px solid #d1d5db',
            boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
            fontSize: '0.875rem',
            color: '#111827',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease'
          } : {})
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: value ? '#111827' : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: '8px' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          ...(dropUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
          left: 0, right: 0, 
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', 
          zIndex: 100, maxHeight: '240px', overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', padding: '4px'
        }}>
          {placeholder && !required && (
            <div 
              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}
              onClick={() => {
                 onChange({ target: { name: name || '', value: '' } });
                 setIsOpen(false);
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              {placeholder}
            </div>
          )}
          {normalizedOptions.map((opt, idx) => (
            <div 
              key={`${opt.value}-${idx}`}
              style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem', color: '#374151', margin: '2px 0', transition: 'background 0.1s' }}
              onClick={() => {
                 const event = {
                   target: { name: name || '', value: opt.value },
                   preventDefault: () => {},
                   stopPropagation: () => {}
                 };
                 onChange(event);
                 setIsOpen(false);
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
            >
              {opt.label}
            </div>
          ))}
          {footer && (
            <div onClick={() => setIsOpen(false)}>
              {footer}
            </div>
          )}
        </div>
      )}
      {required && (
        <input 
          type="text" 
          value={value} 
          required 
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none', bottom: 0, left: '50%' }} 
          onChange={() => {}} 
          onFocus={() => setIsOpen(true)}
        />
      )}
    </div>
  );
}
