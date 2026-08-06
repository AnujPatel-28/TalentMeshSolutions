"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export type LoaderStage = 'loading' | 'slow' | 'timeout';

/**
 * Hook to manage UI loader messaging progressively:
 * - 0–2s: Standard loading spinner state.
 * - 2s to Timeout: Displays a "This is taking longer than usual..." message.
 * - Timeout: Shows a timeout message with a retry action callback.
 */
export function useProgressiveLoader(timeoutMs: number, onRetry?: () => void) {
  const [stage, setStage] = useState<LoaderStage>('loading');
  const timer2s = useRef<NodeJS.Timeout | null>(null);
  const timerTimeout = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setStage('loading');

    if (timer2s.current) clearTimeout(timer2s.current);
    if (timerTimeout.current) clearTimeout(timerTimeout.current);

    timer2s.current = setTimeout(() => {
      setStage('slow');
    }, 2000);

    timerTimeout.current = setTimeout(() => {
      setStage('timeout');
    }, timeoutMs);
  }, [timeoutMs]);

  const stop = useCallback(() => {
    if (timer2s.current) clearTimeout(timer2s.current);
    if (timerTimeout.current) clearTimeout(timerTimeout.current);
  }, []);

  const retry = useCallback(() => {
    start();
    if (onRetry) {
      onRetry();
    }
  }, [start, onRetry]);

  useEffect(() => {
    return () => {
      if (timer2s.current) clearTimeout(timer2s.current);
      if (timerTimeout.current) clearTimeout(timerTimeout.current);
    };
  }, []);

  return { stage, start, stop, retry };
}
