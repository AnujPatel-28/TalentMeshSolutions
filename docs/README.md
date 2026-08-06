# TalentMesh — Documentation

**Start here.** This index is the map; every other document hangs off it.

Documentation in this repo is treated as *intent*, not fact. Where a document and the source
disagree, **the source wins** — several docs here were written against an earlier architecture and
are kept for history, not guidance. Anything under `archive/` is explicitly not maintained.

---

## If you are new to this codebase

Read in this order:

| # | Document | Why |
|---|---|---|
| 1 | [00-project-overview.md](00-project-overview.md) | What TalentMesh is and how the pieces fit |
| 2 | [../DEVELOPER_HANDOFF.md](../DEVELOPER_HANDOFF.md) | Environment setup, running locally, deploy path |
| 3 | [specs/41_V1_Scope_Lock_And_V2_Plan.md](specs/41_V1_Scope_Lock_And_V2_Plan.md) | **The single most important doc.** What V1 actually ships and what was deliberately deferred |
| 4 | [architecture/auth.md](architecture/auth.md) | Auth lifecycle — the most intricate part of the system |
| 5 | [architecture/database-schema.md](architecture/database-schema.md) | Data model |

---

## Current documentation

### `architecture/` — how the system is built
| Document | Covers |
|---|---|
| [auth.md](architecture/auth.md) | Auth lifecycle: OAuth (Google/LinkedIn), email, sessions |
| [authorization.md](architecture/authorization.md) | Role model and permission enforcement |
| [database-schema.md](architecture/database-schema.md) | Tables, relationships, RLS posture |
| [job-board.md](architecture/job-board.md) | Public job board and the subdomain split |
| [proxy-performance-plan.md](architecture/proxy-performance-plan.md) | `proxy.ts` routing + performance refactor plan |

### `api/` — interface contracts
| Document | Covers |
|---|---|
| [backend-api-inventory.md](backend-api-inventory.md) | **Full backend inventory** — 65 tables, RLS, RPCs, 54 edge functions, storage, auth, REST, security audit. Verified against the live database 2026-08-05 |
| [api-review.md](api-review.md) | **Architecture review** of that inventory — classification, edge-function verdicts, workflow analysis, prioritised recommendations, and the V1 API freeze checklist. Read before generating OpenAPI |
| [openapi.json](api/openapi.json) | OpenAPI/Swagger spec, generated from `app/api/` — run `npm run docs:openapi` |

### `runbooks/` — operational procedures
| Document | Covers |
|---|---|
| [edge-functions-imports.md](runbooks/edge-functions-imports.md) | Edge-function import constraints and the bundling requirement |
| [job-approval-test-plan.md](runbooks/job-approval-test-plan.md) | Manual test plan for the job-approval flow |
| [e2e-known-failures.md](runbooks/e2e-known-failures.md) | Analysis of failing Playwright specs — see the CI caveat below |

### `security/` — audits and findings
| Document | Covers |
|---|---|
| [authentication-architecture-audit.md](security/authentication-architecture-audit.md) | Auth architecture audit |
| [auth-audit-response.md](security/auth-audit-response.md) | Response and remediation to the above |
| [live-backend-audit.md](security/live-backend-audit.md) | Audit against the live InsForge backend |
| [recruiter-company-first-alignment-audit-2026-08-02.md](security/recruiter-company-first-alignment-audit-2026-08-02.md) | Most recent — recruiter/company-first conformance |

### `specs/` — the numbered design series (50 docs)
The Recruiter & Company architecture and implementation series, `00`–`44`. It has **its own
index**: [specs/README.md](specs/README.md).

Read [41_V1_Scope_Lock_And_V2_Plan.md](specs/41_V1_Scope_Lock_And_V2_Plan.md) first — it is dated,
marked `decided`, and states which earlier docs it supersedes. Later numbers generally supersede
earlier ones; the highest-numbered doc on a topic wins.

### `backlog/` — known open work
Three documents covering open bugs and deferred phases.

### Planning
| Document | Covers |
|---|---|
| [00-repo-cleanup-plan.md](00-repo-cleanup-plan.md) | The 2026-08-05 repo cleanup: what moved, what was deleted, what remains |
| [FRD-and-Technical-QA-Guide.md](FRD-and-Technical-QA-Guide.md) | Functional requirements and QA guide |

---

## `archive/` — history, not guidance

**Not maintained. Do not treat as current.** Kept because it records *why* decisions were made.
See [archive/README.md](archive/README.md) for what is in there and the traps it contains.

---

## Two things to know before you trust anything here

1. **The CI `e2e` and `security-mock-auth-off` jobs have never run.** The `test` job they depend on
   failed on every execution until 2026-08-05. Expect genuine failures the first time they run —
   that is discovery, not regression. See [00-repo-cleanup-plan.md](00-repo-cleanup-plan.md) §8.

2. **Production DDL has been applied out-of-band.** The migration ledger in `insforge/migrations/`
   is not a complete record of live schema. Verify against the live database before trusting any
   schema document. The one-off hotfixes that may be the only record of some changes are preserved
   in [archive/sql-hotfixes/](archive/sql-hotfixes/).
