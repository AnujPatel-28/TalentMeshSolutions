'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { invokeFunction, insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { safeValidate, settingsSchema } from '@/lib/contracts/schemas';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlatformSettings = {
  general: any;
  feature_flags: any;
  maintenance: any;
};

export type AdminMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  session_type: 'normal' | 'impersonation';
  session_name: string;
  ip_hash: string;
  user_agent: string;
  country: string;
  region: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_active_at: string;
  impersonation_started_at: string | null;
  impersonated_by: string | null;
};

export type QuarantinedFile = {
  id: string;
  bucket_name: string;
  file_path: string;
  original_path: string;
  quarantined_at: string;
  expires_at: string;
  restore_requested_at: string | null;
  restored_at: string | null;
  status: 'quarantined' | 'restoring' | 'restored' | 'deleted';
};

export function useAdminSettings() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/dashboard/admin');
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<'general' | 'devices' | 'quarantine'>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [quarantinedFiles, setQuarantinedFiles] = useState<QuarantinedFile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [adminName, setAdminName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  // Renaming session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');

  useEffect(() => {
    if (user?.name) {
      setAdminName(user.name);
    }
  }, [user]);

  const fetchGeneral = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        invokeFunction('admin-settings', { method: 'GET' }),
        invokeFunction('admin-settings', { method: 'GET', queries: { section: 'admins' } })
      ]);
      
      if (!sRes.error && sRes.data) {
        const fallbackSettings = {
          schemaVersion: 'v1',
          general: {
            platformName: 'TalentMesh',
            supportEmail: 'support@talentmesh.ai',
            tagline: 'The Future of Professional Integration'
          },
          feature_flags: {},
          maintenance: {
            enabled: false
          }
        };
        const validatedSettings = safeValidate(settingsSchema, sRes.data, fallbackSettings, 'strict');
        setSettings(validatedSettings);
      }
      if (!aRes.error) setAdmins(aRes.data.admins);
    } catch (err) {
      console.error('Settings fetch or validation failed:', err);
      setMessage({ text: 'Internal settings sync failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const { data, error } = await insforge.database
        .from('user_sessions')
        .select('*')
        .order('last_active_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch user sessions:', err.message);
      setMessage({ text: 'Failed to load device sessions', type: 'error' });
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  const fetchQuarantine = useCallback(async () => {
    setQuarantineLoading(true);
    try {
      const { data, error } = await insforge.database
        .from('storage_quarantine')
        .select('*')
        .order('quarantined_at', { ascending: false });

      if (error) throw error;
      setQuarantinedFiles(data || []);
    } catch (err: any) {
      console.error('Failed to fetch quarantined files:', err.message);
      setMessage({ text: 'Failed to load quarantine items', type: 'error' });
    } finally {
      setQuarantineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'general') {
      fetchGeneral();
    } else if (activeTab === 'devices') {
      fetchDevices();
    } else if (activeTab === 'quarantine') {
      fetchQuarantine();
    }
  }, [activeTab, fetchGeneral, fetchDevices, fetchQuarantine]);

  const updateSetting = async (key: string, value: any) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { queueOfflineAction } = await import('@/hooks/useNetworkState');
        queueOfflineAction('admin-settings', {
          method: 'PATCH',
          body: { key, value },
        });
        setSettings(prev => prev ? { ...prev, [key]: value } : null);
        setMessage({ text: 'Offline: Changes queued and will sync when connection is restored.', type: 'info' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      } catch (err) {
        console.error('Failed to queue setting change offline:', err);
      }
    }

    try {
      const { error } = await invokeFunction('admin-settings', {
        method: 'PATCH',
        body: { key, value },
      });
      if (!error) {
        setSettings(prev => prev ? { ...prev, [key]: value } : null);

        if (key === 'maintenance') {
          if (value.enabled) {
            document.cookie = "tm_maintenance=true; path=/; max-age=31536000; SameSite=Lax";
          } else {
            document.cookie = "tm_maintenance=; path=/; max-age=0; SameSite=Lax";
          }
        }

        setMessage({ text: 'Global configuration persisted successfully', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch {
      setMessage({ text: 'Persistence failure', type: 'error' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingProfile(true);
    setMessage({ text: '', type: '' });
    try {
      const { error } = await insforge.database
        .from('profiles')
        .update({ name: adminName })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      setMessage({ text: 'Personal profile updated successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Profile update failed', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) updateSetting('general', settings.general);
  };

  const toggleFeature = (flagKey: string) => {
    if (!settings) return;
    const currentFlags = settings.feature_flags || {};
    const nextFlags = { ...currentFlags, [flagKey]: !currentFlags[flagKey] };
    updateSetting('feature_flags', nextFlags);
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { queueOfflineAction } = await import('@/hooks/useNetworkState');
        queueOfflineAction('admin-settings', {
          method: 'POST',
          body: { email: newAdminEmail, password: newAdminPassword, action: 'add_admin' },
        });
        setNewAdminEmail('');
        setNewAdminPassword('');
        setMessage({ text: 'Offline: Grant access request queued for synchronization.', type: 'info' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      } catch (err) {
        console.error('Failed to queue add admin offline:', err);
      }
    }

    try {
      const { error } = await invokeFunction('admin-settings', {
        method: 'POST',
        body: { email: newAdminEmail, password: newAdminPassword, action: 'add_admin' },
      });
      if (!error) {
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchGeneral();
        setMessage({ text: 'Administrative access granted', type: 'success' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network failure', type: 'error' });
    }
  };

  const removeAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to revoke administrative access for this user?')) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { queueOfflineAction } = await import('@/hooks/useNetworkState');
        queueOfflineAction('admin-settings', {
          method: 'DELETE',
          body: { id },
        });
        setMessage({ text: 'Offline: Revoke access request queued for synchronization.', type: 'info' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      } catch (err) {
        console.error('Failed to queue remove admin offline:', err);
      }
    }

    try {
      const { error } = await invokeFunction('admin-settings', {
        method: 'DELETE',
        body: { id },
      });
      if (!error) {
        fetchGeneral();
        setMessage({ text: 'Admin privileges revoked', type: 'info' });
      }
    } catch {
      setMessage({ text: 'Revocation failed', type: 'error' });
    }
  };

  const changeAdminRole = async (id: string, role: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { queueOfflineAction } = await import('@/hooks/useNetworkState');
        queueOfflineAction('admin-settings', {
          method: 'POST',
          body: { id, role, action: 'update_role' },
        });
        setMessage({ text: 'Offline: Role update queued for synchronization.', type: 'info' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      } catch (err) {
        console.error('Failed to queue update role offline:', err);
      }
    }

    try {
      const { error } = await invokeFunction('admin-settings', {
        method: 'POST',
        body: { id, role, action: 'update_role' },
      });
      if (!error) {
        fetchGeneral();
        setMessage({ text: 'Admin role updated successfully', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Role update failed', type: 'error' });
    }
  };

  // Device Session Management Actions
  const handleRenameSession = async (sessionId: string) => {
    if (!editSessionName.trim()) return;
    try {
      const { error } = await insforge.database
        .from('user_sessions')
        .update({ session_name: editSessionName })
        .eq('id', sessionId);

      if (error) throw error;
      setEditingSessionId(null);
      setEditSessionName('');
      fetchDevices();
      setMessage({ text: 'Session renamed successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The user will be logged out instantly.')) return;
    try {
      const { error } = await insforge.database
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      fetchDevices();
      setMessage({ text: 'Session revoked successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Quarantine Management Actions
  const handleRestoreQuarantine = async (itemId: string) => {
    if (!confirm('Request file restoration back to its original location?')) return;
    try {
      const { error } = await insforge.database
        .from('storage_quarantine')
        .update({ 
          status: 'restoring',
          restore_requested_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      // Trigger the edge function to physically restore the file. Report success only if it
      // actually ran — previously this was fire-and-forget and always claimed success. See doc 12 (F-9).
      const restoreRes = await fetch('/api/v1/remote/functions/cleanup-stale-resources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.sessionStorage.getItem('tm_token') || ''}`
        }
      });
      if (!restoreRes.ok) throw new Error('File flagged for restore, but the storage worker did not confirm completion.');

      fetchQuarantine();
      setMessage({ text: 'Restore request submitted and completed successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handlePurgeQuarantine = async (itemId: string) => {
    if (!confirm('Physically purge this file from storage immediately? This action is IRREVERSIBLE.')) return;
    try {
      const { error } = await insforge.database
        .from('storage_quarantine')
        .update({ status: 'deleted' })
        .eq('id', itemId);

      if (error) throw error;

      // Trigger physical purge in the edge worker. Report success only if it actually ran —
      // previously this was fire-and-forget and always claimed success. See doc 12 (F-9).
      const purgeRes = await fetch('/api/v1/remote/functions/cleanup-stale-resources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.sessionStorage.getItem('tm_token') || ''}`
        }
      });
      if (!purgeRes.ok) throw new Error('File marked deleted, but the storage worker did not confirm the physical purge.');

      fetchQuarantine();
      setMessage({ text: 'File purged from storage successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  return {
    user,
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    admins,
    sessions,
    quarantinedFiles,
    loading,
    devicesLoading,
    quarantineLoading,
    message,
    setMessage,
    adminName,
    setAdminName,
    savingProfile,
    newAdminEmail,
    setNewAdminEmail,
    newAdminPassword,
    setNewAdminPassword,
    editingSessionId,
    setEditingSessionId,
    editSessionName,
    setEditSessionName,
    fetchGeneral,
    fetchDevices,
    fetchQuarantine,
    updateSetting,
    handleSaveProfile,
    handleGeneralSave,
    toggleFeature,
    addAdmin,
    removeAdmin,
    changeAdminRole,
    handleRenameSession,
    handleRevokeSession,
    handleRestoreQuarantine,
    handlePurgeQuarantine,
  };
}
