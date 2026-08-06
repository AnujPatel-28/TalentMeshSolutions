# Technical Audit Report — Recruiter Settings

Feature: Settings
Option: Profile, Company Details, Branding
Inner Function: Logo upload, validation
Status: Production Ready
Severity: P3
Risk: Logo dimensions cause layout shifts on candidate-facing portals.
Files: [upload-logo/index.ts](file:///d:/Talentmesh-AI-Recruiting-/insforge/functions/upload-logo/index.ts)
Required Change: Enforce image resizing on logo uploads.
Implementation: Rescale logos to maximum 256x256 before saving to bucket.
ETA: 1 Day
Owner: UI Designer
Acceptance Criteria:
- Uploaded logos are automatically resized
- Layout shift is eliminated
