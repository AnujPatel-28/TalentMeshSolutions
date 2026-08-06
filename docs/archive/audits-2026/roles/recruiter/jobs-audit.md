# Technical Audit Report — Recruiter Jobs

Feature: Jobs
Option: Create, Draft, Publish, Archive, Clone
Inner Function: Approval, schedule, validation
Status: Needs Upgrade
Severity: P1
Risk: Jobs published without Admin approvals bypass RLS controls.
Files: [jobs/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/recruiter/[role_id]/jobs/page.tsx), [admin-jobs/index.ts](file:///d:/Talentmesh-AI-Recruiting-/insforge/functions/admin-jobs/index.ts)
Required Change: Enforce database level approval status checks.
Implementation: Add strict check 'is_approved = true' in select policies.
ETA: 3 Days
Owner: Database Lead
Acceptance Criteria:
- Recruiters cannot set status to active without approval
- Clone copies description but resets approval state
