# Technical Audit Report — Candidate Resume

Feature: Resume
Option: Upload, Delete, Restore, Version, AI Parse, Export
Inner Function: Virus scan, queue, parse retry, metadata, restore
Status: Needs Upgrade
Severity: P2
Risk: Resume parser downtime causes silent upload failures; lack of version history prevents recovering old resume copies.
Files: [resumes/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/candidate/[role_id]/resumes/page.tsx), [resume-parse/index.ts](file:///d:/Talentmesh-AI-Recruiting-/insforge/functions/resume-parse/index.ts)
Required Change: Queue resume parsing and create resume versioning.
Implementation: Create 'resume_versions' table and 'resume_restore()' function.
ETA: 4 Days
Owner: AI Integrations Engineer
Acceptance Criteria:
- Multi-version resumes are listed
- Restored resumes regain active status
- Parser failure triggers automatic retry queue
