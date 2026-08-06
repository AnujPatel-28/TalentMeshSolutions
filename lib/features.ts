import type { UserRole } from '@/types/auth';

export interface FeatureFlag {
  enabled: boolean;
  percentage: number;   // 0-100 rollout percentage
  roles: UserRole[];    // which roles can see this feature
  expiresAt?: string;   // ISO date — auto-disable after
}

const FLAGS: Record<string, FeatureFlag> = {
  RESUME_V2: {
    enabled: process.env.NEXT_PUBLIC_FEATURE_RESUME_V2 === 'true',
    percentage: 5,
    roles: ['admin', 'super_admin', 'candidate'],
  },
  TALENT_POOL: {
    enabled: false,
    percentage: 0,
    roles: ['admin', 'super_admin'],
  },
};

/**
 * Checks if a feature flag is enabled for a specific user and role.
 * Rollouts use a deterministic hash of the userId to assign buckets.
 */
export function isFeatureEnabled(key: string, role?: UserRole, userId?: string): boolean {
  const flag = FLAGS[key];
  if (!flag) return false;

  // 1. Check expiration date
  if (flag.expiresAt) {
    const expiry = new Date(flag.expiresAt).getTime();
    if (Date.now() > expiry) return false;
  }

  // 2. Check basic status
  if (!flag.enabled) return false;

  // 3. Check role access
  if (role && flag.roles.length > 0 && !flag.roles.includes(role)) {
    return false;
  }

  // 4. Percentage rollout
  if (flag.percentage > 0 && flag.percentage < 100) {
    if (!userId) return false;
    // Simple hash algorithm to get a deterministic integer between 0 and 99
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bucket = Math.abs(hash) % 100;
    return bucket < flag.percentage;
  }

  return true;
}

export function getAllFeatureFlags(): Record<string, FeatureFlag> {
  return FLAGS;
}
