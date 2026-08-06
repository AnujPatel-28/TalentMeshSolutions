import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { AdminButton } from './AdminForm';

interface BulkConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  actionName: string;
  impactText: string;
  isLoading?: boolean;
}

export const BulkConfirmModal: React.FC<BulkConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  actionName,
  impactText,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getActionColors = () => {
    const act = actionName.toLowerCase();
    if (act.includes('delete') || act.includes('reject') || act.includes('deactivate')) {
      return {
        bg: '#fef2f2',
        border: '#fee2e2',
        text: '#991b1b',
        btnVariant: 'danger' as const,
        icon: <ShieldAlert style={{ color: '#ef4444' }} size={24} />
      };
    }
    return {
      bg: '#eff6ff',
      border: '#dbeafe',
      text: '#1e3a8a',
      btnVariant: 'primary' as const,
      icon: <AlertTriangle style={{ color: '#3b82f6' }} size={24} />
    };
  };

  const colors = getActionColors();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'modalScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          {colors.icon}
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Confirm Bulk Action
          </h2>
        </div>

        <div style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: colors.text,
          lineHeight: '1.5'
        }}>
          <strong>Target Selection:</strong> {selectedCount} items selected.<br />
          <strong>Expected Impact:</strong> {impactText}
        </div>

        <div style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.75rem',
          fontSize: '0.85rem',
          color: '#92400e',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <strong>⚠️ Undo Support Info:</strong>
          <span>
            {actionName.toLowerCase() === 'delete'
              ? 'This action takes effect immediately and is completely irreversible.'
              : 'This action has a 30-second undo window. You can cancel the action by clicking the Undo button on the banner that appears after confirmation.'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <AdminButton
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            style={{ flex: 1, padding: '10px' }}
          >
            Cancel
          </AdminButton>
          <AdminButton
            variant={colors.btnVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            style={{ flex: 2, padding: '10px' }}
          >
            Confirm {actionName}
          </AdminButton>
        </div>
      </div>
    </div>
  );
};
