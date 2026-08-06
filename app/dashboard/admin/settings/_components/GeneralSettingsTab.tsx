'use client';

import React from 'react';
import styles from '../settings.module.css';
import { 
  PlatformSettings, 
  AdminMember 
} from '@/lib/hooks/useAdminSettings';

interface GeneralSettingsTabProps {
  user: any;
  settings: PlatformSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<PlatformSettings | null>>;
  admins: AdminMember[];
  adminName: string;
  setAdminName: (name: string) => void;
  savingProfile: boolean;
  newAdminEmail: string;
  setNewAdminEmail: (email: string) => void;
  newAdminPassword: string;
  setNewAdminPassword: (password: string) => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  handleGeneralSave: (e: React.FormEvent) => void;
  toggleFeature: (flagKey: string) => void;
  addAdmin: (e: React.FormEvent) => void;
  removeAdmin: (id: string) => void;
  changeAdminRole: (id: string, role: string) => void;
  updateSetting: (key: string, value: any) => void;
}

export default function GeneralSettingsTab({
  user,
  settings,
  setSettings,
  admins,
  adminName,
  setAdminName,
  savingProfile,
  newAdminEmail,
  setNewAdminEmail,
  newAdminPassword,
  setNewAdminPassword,
  handleSaveProfile,
  handleGeneralSave,
  toggleFeature,
  addAdmin,
  removeAdmin,
  changeAdminRole,
  updateSetting,
}: GeneralSettingsTabProps) {
  return (
    <div className={styles.settingsGrid}>
      <div className={styles.mainCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Personal Profile Settings</h3>
          <form onSubmit={handleSaveProfile}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                className={styles.input}
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="Administrator Name"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                className={`${styles.input} ${styles.disabledInput}`}
                value={user?.email || ''}
                disabled
              />
              <span className={styles.inputHint}>Email cannot be changed here.</span>
            </div>
            <button type="submit" className={styles.primaryButton} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Update Personal Profile'}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>General Configuration</h3>
          <form onSubmit={handleGeneralSave}>
            <div className={styles.formGroup}>
              <label>Platform Identity Name</label>
              <input
                className={styles.input}
                value={settings?.general?.platformName || 'TalentMesh'}
                onChange={e => setSettings(prev => ({ ...prev!, general: { ...prev!.general, platformName: e.target.value } }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Support Nexus Email</label>
              <input
                className={styles.input}
                value={settings?.general?.supportEmail || 'support@talentmesh.ai'}
                onChange={e => setSettings(prev => ({ ...prev!, general: { ...prev!.general, supportEmail: e.target.value } }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Platform Tagline / Slogan</label>
              <input
                className={styles.input}
                value={settings?.general?.tagline || 'The Future of Professional Integration'}
                onChange={e => setSettings(prev => ({ ...prev!, general: { ...prev!.general, tagline: e.target.value } }))}
              />
            </div>
            <button type="submit" className={styles.primaryButton}>Persist Infrastructure Settings</button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Administrators List</h3>
          <table className={styles.adminTable}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.tableHeaderCell}>Administrator</th>
                <th>Authority Role</th>
                <th className={styles.alignRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => {
                const isSelf = admin.id === user?.id;
                return (
                  <tr key={admin.id} className={styles.tableBodyRow}>
                    <td className={styles.tableBodyCell}>
                      <div className={styles.adminMemberName}>{admin.name}</div>
                      <div className={styles.adminMemberEmail}>{admin.email}</div>
                    </td>
                    <td>
                      <select
                        value={admin.role}
                        onChange={(e) => changeAdminRole(admin.id, e.target.value)}
                        disabled={isSelf}
                        className={`${styles.roleSelect} ${admin.role === 'super_admin' ? styles.superAdminRole : styles.adminRole}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className={styles.alignRight}>
                      <button
                        type="button"
                        className={`${styles.revokeButton} ${isSelf ? styles.disabledRevoke : ''}`}
                        onClick={() => !isSelf && removeAdmin(admin.id)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot revoke your own access' : undefined}
                      >
                        Revoke Access
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <form onSubmit={addAdmin} className={styles.addAdminForm}>
            <input
              className={`${styles.input} ${styles.flexInput}`}
              type="email"
              placeholder="Candidate Email Address..."
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              required
            />
            <input
              className={`${styles.input} ${styles.flexInput}`}
              type="password"
              placeholder="Create password for new user..."
              value={newAdminPassword}
              onChange={e => setNewAdminPassword(e.target.value)}
              required
            />
            <button type="submit" className={styles.primaryButton}>Grant Admin Authority</button>
          </form>
        </div>
      </div>

      <div className={styles.sideCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Architectural Flags</h3>
          <div className={styles.featureList}>
            {[
              { key: 'candidateRegistration', label: 'Candidate Signups', desc: 'Allow new candidates to register' },
              { key: 'recruiterRegistration', label: 'Employer Signups', desc: 'Allow new employers to register' },
              { key: 'blogEnabled', label: 'Public Blog', desc: 'Show the public blog section' },
              { key: 'messagingEnabled', label: 'Direct Chat', desc: 'Allow candidates and recruiters to chat' },
              { key: 'aiMatching', label: 'AI Matching', desc: 'Automatically match candidates with jobs' },
            ].map(flag => (
              <div key={flag.key} className={styles.featureItem}>
                <div className={styles.featureInfo}>
                  <strong>{flag.label}</strong>
                  <span>{flag.desc}</span>
                </div>
                <div
                  className={`${styles.toggle} ${settings?.feature_flags?.[flag.key] ? styles.toggleOn : ''}`}
                  onClick={() => toggleFeature(flag.key)}
                >
                  <div className={styles.toggleKnob} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.card} ${styles.dangerCard}`}>
          <h3 className={`${styles.cardTitle} ${styles.dangerTitle}`}>Danger Nexus</h3>
          <div className={styles.warningBox}>
            CRITICAL: Enabling Maintenance Mode will immediately redirect all non-administrative traffic to the construction gateway.
          </div>
          <div className={`${styles.featureItem} ${styles.maintenanceItem}`}>
            <div className={styles.featureInfo}>
              <strong className={styles.maintenanceTitle}>Maintenance Mode</strong>
              <span>Block access for non-administrators</span>
            </div>
            <div
              className={`${styles.toggle} ${settings?.maintenance?.enabled ? styles.toggleOn : ''} ${settings?.maintenance?.enabled ? styles.toggleMaintenanceOn : ''}`}
              onClick={() => {
                const currentMaintenance = settings?.maintenance || { enabled: false };
                updateSetting('maintenance', { ...currentMaintenance, enabled: !currentMaintenance.enabled });
              }}
            >
              <div className={styles.toggleKnob} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
