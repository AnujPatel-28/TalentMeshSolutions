# Technical Audit Report — Recruiter Team Access

Feature: Recruiter Team
Option: Invite, Roles, Permissions
Inner Function: Approval, ownership
Status: Needs Upgrade
Severity: P1
Risk: Missing recruiter sub-roles (standard vs manager) allows unauthorized setting updates.
Files: [team/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/admin/team/page.tsx)
Required Change: Implement company recruiter roles.
Implementation: Store 'recruiter_roles' and enforce team policy checks.
ETA: 5 Days
Owner: Lead Security Architect
Acceptance Criteria:
- Standard recruiter cannot view billing configurations
- Manager can invite new recruiters and revoke permissions
