# Technical Audit Report — Recruiter Reports

Feature: Reports
Option: Generation, Filter, Export
Inner Function: Background queue, locks
Status: Production Ready
Severity: P2
Risk: File link generation leaks to unauthorized company users.
Files: [export-system-audit.md](../../admin/export-system-audit.md)
Required Change: Require temporary pre-signed URL signatures for reports.
Implementation: Generate signed S3 URLs for export downloads.
ETA: 2 Days
Owner: SRE
Acceptance Criteria:
- Exported links expire after 1 hour
- Links are validated against company ID checks
