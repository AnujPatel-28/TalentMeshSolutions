'use client';

import React from 'react';
import { Smartphone, RefreshCw, Edit2, Globe, XCircle } from 'lucide-react';
import { UserSession } from '@/lib/hooks/useAdminSettings';

interface DeviceSessionsTabProps {
  sessions: UserSession[];
  devicesLoading: boolean;
  fetchDevices: () => void;
  editingSessionId: string | null;
  setEditingSessionId: (id: string | null) => void;
  editSessionName: string;
  setEditSessionName: (name: string) => void;
  handleRenameSession: (sessionId: string) => void;
  handleRevokeSession: (sessionId: string) => void;
}

export default function DeviceSessionsTab({
  sessions,
  devicesLoading,
  fetchDevices,
  editingSessionId,
  setEditingSessionId,
  editSessionName,
  setEditSessionName,
  handleRenameSession,
  handleRevokeSession,
}: DeviceSessionsTabProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-violet-500" />
          Active Device Governance
        </h2>
        <button
          onClick={fetchDevices}
          disabled={devicesLoading}
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-neutral-800 border border-neutral-700 py-1.5 px-3 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${devicesLoading ? 'animate-spin' : ''}`} />
          Refresh list
        </button>
      </div>

      {devicesLoading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Loading active sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400">No active user sessions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4">Device / Session Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">IP Hash</th>
                <th className="py-3 px-4">Last active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-sm">
              {sessions.map(sess => {
                const isSessionRevoked = sess.revoked_at !== null || new Date(sess.expires_at) < new Date();
                
                return (
                  <tr key={sess.id} className="hover:bg-neutral-850/40">
                    <td className="py-4 px-4 font-medium text-neutral-200">
                      {editingSessionId === sess.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editSessionName}
                            onChange={e => setEditSessionName(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                          <button
                            onClick={() => handleRenameSession(sess.id)}
                            type="button"
                            className="text-xs bg-violet-600 text-white rounded px-2 py-1 hover:bg-violet-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            type="button"
                            className="text-xs bg-neutral-700 text-neutral-300 rounded px-2 py-1 hover:bg-neutral-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{sess.session_name || 'Unknown Browser'}</span>
                          {!isSessionRevoked && (
                            <button
                              onClick={() => {
                                setEditingSessionId(sess.id);
                                setEditSessionName(sess.session_name || '');
                              }}
                              type="button"
                              className="text-neutral-500 hover:text-neutral-300 transition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-neutral-500 truncate max-w-xs mt-0.5" title={sess.user_agent}>
                        {sess.user_agent}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        sess.session_type === 'impersonation'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {sess.session_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-neutral-350">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{sess.region && sess.country ? `${sess.region}, ${sess.country}` : 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-neutral-400" title={sess.ip_hash}>
                      {sess.ip_hash.substring(0, 12)}...
                    </td>
                    <td className="py-4 px-4 text-neutral-350 text-xs">
                      {new Date(sess.last_active_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isSessionRevoked ? (
                        <span className="text-xs text-rose-500/80 font-medium flex items-center justify-end gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          Revoked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          type="button"
                          className="text-xs text-rose-500 hover:text-rose-400 hover:underline font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
