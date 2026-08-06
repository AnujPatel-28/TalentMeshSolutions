# TalentMesh — Audit Reports Index

This directory contains all technical audit reports for the TalentMesh AI Recruiting platform, organized by role-based modules and platform infrastructure.

---

## Directory Structure

```
audits/
├── README.md                                    ← This index file
├── production-readiness-executive-summary.md    ← Platform Executive Summary & Scorecard
│
└── roles/
    ├── candidate/                               ← Candidate Role Module Audits
    │   ├── profile-audit.md                     ← Profile Edit, Avatar, snapshots
    │   ├── resume-audit.md                      ← Upload, AI parsing, quarantine deletes
    │   ├── applications-audit.md                ← App tracking and status transitions
    │   ├── notifications-audit.md               ← Real-time notifications and toasts
    │   ├── analytics-audit.md                   ← Candidate match calculation cache
    │   └── security-audit.md                    ← Session check and MFA controls
    │
    ├── recruiter/                               ← Recruiter Role Module Audits
    │   ├── jobs-audit.md                        ← Create, draft, approvals checks
    │   ├── candidates-audit.md                  ← Search, select, and recruiter ownership
    │   ├── pipeline-audit.md                    ← Hiring pipeline stage transitions
    │   ├── team-access-audit.md                 ← Recruiter roles and team management
    │   ├── reports-audit.md                     ← Background exports and S3 links
    │   └── settings-audit.md                    ← Company settings and logo rescaling
    │
    ├── admin/                                   ← Admin Role Module Audits
    │   ├── governance-audit.md                  ← Feature flags and maintenance configs
    │   ├── sessions-audit.md                    ← Active devices list and concurrent caps
    │   ├── audit-center-audit.md                ← Audit log search and PG partitions
    │   ├── release-manager-audit.md             ← SQL migration registry and revert checks
    │   ├── plans-billing-audit.md               ← Subscriptions, plans, and metrics
    │   └── operations-audit.md                  ← Stale resources and webhook alerts
    │
    └── platform/                                ← Platform Infrastructure Audits
        ├── observability-audit.md               ← Traces limit and database sync
        ├── edge-audit.md                        ← Cold starts and pre-warming triggers
        ├── database-audit.md                    ← Postgres RLS and Trigram index optimizations
        ├── storage-audit.md                     ← Bucket security and logo quarantining
        └── release-audit.md                     ← Deployment safety and staging checks
```

---

## Technical Audit Index

### 👑 Executive
* **Executive Summary**: [production-readiness-executive-summary.md](./production-readiness-executive-summary.md)

### 👤 Candidate Role Module
* **Profile Edit & Snapshot Versions**: [profile-audit.md](./roles/candidate/profile-audit.md)
* **Resume Upload & AI Parsing**: [resume-audit.md](./roles/candidate/resume-audit.md)
* **Applications tracking**: [applications-audit.md](./roles/candidate/applications-audit.md)
* **Notifications**: [notifications-audit.md](./roles/candidate/notifications-audit.md)
* **Analytics Match Score**: [analytics-audit.md](./roles/candidate/analytics-audit.md)
* **Security & MFA**: [security-audit.md](./roles/candidate/security-audit.md)

### 👔 Recruiter Role Module
* **Jobs Draft & Approval**: [jobs-audit.md](./roles/recruiter/jobs-audit.md)
* **Candidates Directory**: [candidates-audit.md](./roles/recruiter/candidates-audit.md)
* **Pipeline Transitions**: [pipeline-audit.md](./roles/recruiter/pipeline-audit.md)
* **Team Access Roles**: [team-access-audit.md](./roles/recruiter/team-access-audit.md)
* **Reports Export**: [reports-audit.md](./roles/recruiter/reports-audit.md)
* **Settings & Logo Rescaling**: [settings-audit.md](./roles/recruiter/settings-audit.md)

### ⚙️ Admin Role Module
* **Governance & Policies**: [governance-audit.md](./roles/admin/governance-audit.md)
* **Session Controls**: [sessions-audit.md](./roles/admin/sessions-audit.md)
* **Audit Center**: [audit-center-audit.md](./roles/admin/audit-center-audit.md)
* **Release Manager**: [release-manager-audit.md](./roles/admin/release-manager-audit.md)
* **Plans & Billing**: [plans-billing-audit.md](./roles/admin/plans-billing-audit.md)
* **Operations**: [operations-audit.md](./roles/admin/operations-audit.md)

### 💻 Platform Infrastructure
* **Observability Tracing**: [observability-audit.md](./roles/platform/observability-audit.md)
* **Edge Functions Gateway**: [edge-audit.md](./roles/platform/edge-audit.md)
* **Database & RLS Constraints**: [database-audit.md](./roles/platform/database-audit.md)
* **Storage Quarantine Purge**: [storage-audit.md](./roles/platform/storage-audit.md)
* **Release Verification**: [release-audit.md](./roles/platform/release-audit.md)
