"use client";

import React from 'react';
import { WifiOff, KeyRound, Clock } from 'lucide-react';

interface SessionExpireModalProps {
  isOpen: boolean;
  countdown: number;
  onExtend: () => void;
  isOffline: boolean;
  onReconnect: () => void;
}

export function SessionExpireModal({
  isOpen,
  countdown,
  onExtend,
  isOffline,
  onReconnect,
}: SessionExpireModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/20 dark:bg-zinc-950/50 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Soft, premium ambient background glows */}
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        {isOffline ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-4 ring-8 ring-rose-500/5 dark:ring-rose-400/5 animate-pulse">
              <WifiOff className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Connection Lost
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs leading-relaxed">
              Your network connection is offline. Reconnect to restore your session and protect unsaved work.
            </p>
            <button
              onClick={onReconnect}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Reconnect Session
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 ring-8 ring-blue-500/5 dark:ring-blue-400/5">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            {/* Kept header exactly for E2E tests */}
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Inactivity Warning
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 max-w-xs leading-relaxed">
              You've been idle for a while. For your security, you will be logged out shortly.
            </p>
            
            {/* Sleek depleting progress bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden mb-5 p-[1px]">
              <div 
                className="bg-gradient-to-r from-blue-500 to-sky-500 dark:from-blue-400 dark:to-sky-400 h-full transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>

            {/* Compact countdown badge */}
            <div className="mb-6">
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3.5 py-1.5 rounded-full border border-blue-100/50 dark:border-blue-900/30 shadow-sm">
                Logging out in <span className="font-extrabold text-blue-600 dark:text-blue-400">{countdown}s</span>
              </span>
            </div>

            {/* Kept button text exactly for E2E tests */}
            <button
              onClick={onExtend}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              Keep Working
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

