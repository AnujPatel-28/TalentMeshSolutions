# Technical Audit Report — Admin Operations

Feature: Operations
Option: Health, Queues, Jobs
Inner Function: Retry, alerts
Status: Needs Upgrade
Severity: P2
Risk: Queue job failures stall silently without Slack/Discord alerts.
Files: [cleanup-stale-resources/index.ts](file:///d:/Talentmesh-AI-Recruiting-/insforge/functions/cleanup-stale-resources/index.ts)
Required Change: Dispatch alerts on worker failures.
Implementation: Connect edge function errors to webhook handlers.
ETA: 3 Days
Owner: SRE
Acceptance Criteria:
- Failed jobs post alerts to admin channels
- Stalled locks are auto-recovered
