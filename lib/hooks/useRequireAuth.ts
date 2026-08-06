"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export const useRequireAuth = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnTo = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : '';
      router.push(`/login${returnTo ? `?returnTo=${returnTo}` : ''}`);
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
};
