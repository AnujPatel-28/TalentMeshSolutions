# Technical Audit Report — Recruiter Candidates Directory

Feature: Candidates
Option: View, Move, Shortlist, Reject
Inner Function: Ownership, permissions
Status: Needs Upgrade
Severity: P1
Risk: Multiple recruiters claim the same candidate without explicit assignment logging.
Files: [candidates/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/recruiter/[role_id]/candidates/page.tsx)
Required Change: Log candidate owner mapping on shortlist/move.
Implementation: Define 'candidate_assignment' table tracking recruiter UUIDs.
ETA: 2 Days
Owner: Product Lead
Acceptance Criteria:
- Assignment is logged to candidate audit log
- Recruiter cannot shortlist candidates owned by other companies
