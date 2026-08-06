# Technical Audit Report — Admin Plans & Billing

Feature: Plans & Billing
Option: Subscription, Invoices, Usage
Inner Function: Pricing plans
Status: Production Ready
Severity: P3
Risk: Incorrect usage data reporting leads to billing disputes.
Files: [billing/page.tsx](file:///d:/Talentmesh-AI-Recruiting-/app/dashboard/admin/billing/page.tsx)
Required Change: Store monthly recruiter usage statistics inside billing aggregates.
Implementation: Auto-tally recruiter active posting count.
ETA: 2 Days
Owner: Finance Systems Lead
Acceptance Criteria:
- Billing metrics update daily
- Recruiter limits trigger upgrade modal
