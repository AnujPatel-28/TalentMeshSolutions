// Single authority for the staff permission matrix (doc 14 §4.2). Consulted by the edge
// preamble (adminAuth.ts requireStaff) and — after R-4 — re-exported by lib/permissions.ts
// so withApi consults the same matrix. Pure TS: no Deno/Node APIs, importable everywhere.
export type StaffRole = 'super_admin' | 'admin' | 'content'; // + 'finance' later
export type Resource =
  | 'dashboard' | 'companies' | 'verification' | 'jobs' | 'applications'
  | 'candidates' | 'recruiters' | 'content' | 'reports'
  | 'billing' | 'plans' | 'settings' | 'team' | 'audit_logs' | 'dpdp';
export type Action = 'view' | 'edit' | 'delete' | 'approve' | 'export';

export const PERMISSIONS: Record<StaffRole, Partial<Record<Resource, Action[]>>> = {
  super_admin: {
    dashboard: ['view'], companies: ['view', 'edit', 'delete', 'approve', 'export'],
    verification: ['view', 'approve'], jobs: ['view', 'edit', 'delete', 'approve', 'export'],
    applications: ['view', 'edit', 'delete', 'export'],
    candidates: ['view', 'edit', 'delete', 'export'], recruiters: ['view', 'edit', 'delete', 'approve', 'export'],
    content: ['view', 'edit', 'delete', 'approve'], reports: ['view', 'export'],
    billing: ['view', 'edit', 'export'], plans: ['view', 'edit', 'delete'],
    settings: ['view', 'edit', 'delete'], team: ['view', 'edit', 'delete'],
    audit_logs: ['view', 'export'], dpdp: ['view', 'edit', 'approve'],
  },
  admin: { // platform operations, NOT billing writes, NOT team/settings
    dashboard: ['view'], companies: ['view', 'edit', 'approve', 'export'],
    verification: ['view', 'approve'], jobs: ['view', 'edit', 'delete', 'approve', 'export'],
    applications: ['view', 'edit', 'export'],
    candidates: ['view', 'edit', 'export'], recruiters: ['view', 'edit', 'approve', 'export'],
    content: ['view', 'edit', 'approve'], reports: ['view', 'export'],
    billing: ['view'], audit_logs: ['view'], dpdp: ['view', 'edit', 'approve'],
  },
  content: { // content-only staff
    dashboard: ['view'], content: ['view', 'edit'], reports: ['view'],
  },
};

export const STAFF_ROLES: readonly string[] = ['super_admin', 'admin', 'content'];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && STAFF_ROLES.includes(role);
}

export function canPerform(role: string, resource: Resource, action: Action): boolean {
  return (PERMISSIONS as Record<string, Partial<Record<Resource, Action[]>>>)[role]?.[resource]?.includes(action) ?? false;
}
