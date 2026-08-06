'use client';

import React from 'react';
import { Settings, Smartphone, FolderLock } from 'lucide-react';
import styles from './settings.module.css';
import { useAdminSettings } from '@/lib/hooks/useAdminSettings';
import GeneralSettingsTab from './_components/GeneralSettingsTab';
import DeviceSessionsTab from './_components/DeviceSessionsTab';
import QuarantineTab from './_components/QuarantineTab';

export default function AdminSettingsPage() {
  const {
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
  } = useAdminSettings();

  if (loading && activeTab === 'general') {
    return (
      <div className={styles.loadingBackbone}>
        Connecting to platform backbone...
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Global Control Center</p>
        <h1 className={styles.title}>Network Governance</h1>
        <p className={styles.subtitle}>
          Modify architecture flags, manage administrative authority, and oversee system integrity.
        </p>
      </header>

      {/* Tabs selector */}
      <div className={styles.tabList}>
        {[
          { id: 'general', label: 'General Settings', icon: <Settings className="h-4 w-4" /> },
          { id: 'devices', label: 'Active Sessions & Devices', icon: <Smartphone className="h-4 w-4" /> },
          { id: 'quarantine', label: 'Quarantine Manager', icon: <FolderLock className="h-4 w-4" /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              type="button"
              className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {message.text && (
        <div className={`${styles.messageBanner} ${styles[message.type] || styles.info}`}>
          {message.text}
        </div>
      )}

      {/* Tab contents */}
      {activeTab === 'general' && (
        <GeneralSettingsTab
          user={user}
          settings={settings}
          setSettings={setSettings}
          admins={admins}
          adminName={adminName}
          setAdminName={setAdminName}
          savingProfile={savingProfile}
          newAdminEmail={newAdminEmail}
          setNewAdminEmail={setNewAdminEmail}
          newAdminPassword={newAdminPassword}
          setNewAdminPassword={setNewAdminPassword}
          handleSaveProfile={handleSaveProfile}
          handleGeneralSave={handleGeneralSave}
          toggleFeature={toggleFeature}
          addAdmin={addAdmin}
          removeAdmin={removeAdmin}
          changeAdminRole={changeAdminRole}
          updateSetting={updateSetting}
        />
      )}

      {activeTab === 'devices' && (
        <DeviceSessionsTab
          sessions={sessions}
          devicesLoading={devicesLoading}
          fetchDevices={fetchDevices}
          editingSessionId={editingSessionId}
          setEditingSessionId={setEditingSessionId}
          editSessionName={editSessionName}
          setEditSessionName={setEditSessionName}
          handleRenameSession={handleRenameSession}
          handleRevokeSession={handleRevokeSession}
        />
      )}

      {activeTab === 'quarantine' && (
        <QuarantineTab
          quarantinedFiles={quarantinedFiles}
          quarantineLoading={quarantineLoading}
          fetchQuarantine={fetchQuarantine}
          handleRestoreQuarantine={handleRestoreQuarantine}
          handlePurgeQuarantine={handlePurgeQuarantine}
        />
      )}
    </section>
  );
}
