# Technical Audit Report — Candidate Analytics

Feature: Analytics
Option: Views, Searches, Match score
Inner Function: Calculation, caching
Status: Production Ready
Severity: P3
Risk: Heavy dashboard match queries cause latency spikes.
Files: [analytics/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/candidate/[role_id]/analytics/page.tsx)
Required Change: Cache calculations on a daily rolling basis.
Implementation: Store match scores inside 'candidate_scores_cache'.
ETA: 2 Days
Owner: SRE
Acceptance Criteria:
- Load times for analytics remain below 150ms
- Calculations update asynchronously
