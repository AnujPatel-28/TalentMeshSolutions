// R-4: this file no longer owns a matrix. `insforge/functions/_shared/permissions.ts` is the
// single authority (doc 14 §4.2); frontend and edge must not fork. Client-side calls remain
// UX-only (hide/disable) — enforcement lives in withApi and requireStaff (doc 14 §4.3).
export { PERMISSIONS, STAFF_ROLES, isStaffRole, canPerform } from '../insforge/functions/_shared/permissions';
export type { StaffRole, StaffRole as Role, Resource, Action } from '../insforge/functions/_shared/permissions';
