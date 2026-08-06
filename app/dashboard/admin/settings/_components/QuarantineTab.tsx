'use client';

import React from 'react';
import { FolderLock, RefreshCw, FileCheck, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { QuarantinedFile } from '@/lib/hooks/useAdminSettings';

interface QuarantineTabProps {
  quarantinedFiles: QuarantinedFile[];
  quarantineLoading: boolean;
  fetchQuarantine: () => void;
  handleRestoreQuarantine: (itemId: string) => void;
  handlePurgeQuarantine: (itemId: string) => void;
}

export default function QuarantineTab({
  quarantinedFiles,
  quarantineLoading,
  fetchQuarantine,
  handleRestoreQuarantine,
  handlePurgeQuarantine,
}: QuarantineTabProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <FolderLock className="h-5 w-5 text-violet-500" />
          Secure Storage Quarantine Manager
        </h2>
        <button
          onClick={fetchQuarantine}
          disabled={quarantineLoading}
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-neutral-800 border border-neutral-700 py-1.5 px-3 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${quarantineLoading ? 'animate-spin' : ''}`} />
          Refresh list
        </button>
      </div>

      {quarantineLoading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Loading quarantine logs...</div>
      ) : quarantinedFiles.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400">No quarantined items found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4">Original File Path</th>
                <th className="py-3 px-4">Bucket</th>
                <th className="py-3 px-4">Quarantined At</th>
                <th className="py-3 px-4">Retention Expires</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-sm">
              {quarantinedFiles.map(file => (
                <tr key={file.id} className="hover:bg-neutral-850/40">
                  <td className="py-4 px-4">
                    <div className="font-medium text-neutral-200">{file.original_path.split('/').pop()}</div>
                    <div className="text-xs text-neutral-500 truncate max-w-sm mt-0.5" title={file.original_path}>
                      {file.original_path}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-neutral-400 text-xs font-semibold">
                    {file.bucket_name}
                  </td>
                  <td className="py-4 px-4 text-neutral-350 text-xs">
                    {new Date(file.quarantined_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-neutral-350 text-xs">
                    {new Date(file.expires_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      file.status === 'quarantined'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : file.status === 'restoring'
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : file.status === 'restored'
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {file.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {file.status === 'quarantined' && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleRestoreQuarantine(file.id)}
                          type="button"
                          className="text-xs text-violet-400 hover:text-violet-300 font-semibold hover:underline flex items-center gap-1"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => handlePurgeQuarantine(file.id)}
                          type="button"
                          className="text-xs text-rose-500 hover:text-rose-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Purge
                        </button>
                      </div>
                    )}
                    {file.status === 'restored' && (
                      <span className="text-xs text-green-500 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Restored
                      </span>
                    )}
                    {file.status === 'restoring' && (
                      <span className="text-xs text-blue-400 font-semibold flex items-center justify-end gap-1">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Restoring
                      </span>
                    )}
                    {file.status === 'deleted' && (
                      <span className="text-xs text-rose-500 font-semibold flex items-center justify-end gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        Purged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
