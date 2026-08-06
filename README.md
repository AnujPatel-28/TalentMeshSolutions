<p align="center">
  <img src="public/TalentMesh_page-0002-removebg-preview.png" alt="TalentMesh" width="240" />
</p>

<h1 align="center">TalentMesh</h1>

<p align="center">
  <strong>Applicant tracking and job board for the Indian market</strong><br />
  Next.js 16 · React 19 · TypeScript · InsForge
</p>

---

## What this is

A recruitment platform with three role-scoped surfaces — **candidate**, **recruiter**, and **admin** —
built on the Next.js App Router with [InsForge](https://insforge.dev) as the backend (PostgreSQL with
RLS, auth, edge functions, storage).

**Start with [`docs/README.md`](docs/README.md)** — it indexes everything else and is kept current.
New to the codebase? [`DEVELOPER_HANDOFF.md`](DEVELOPER_HANDOFF.md) covers setup end to end.

---

## Getting started

**Requires Node 20+** (Next 16; CI builds on Node 20).

```bash
npm install
npm run env:check   # verifies required env vars before you waste time on a failing boot
npm run dev
```

Then open <http://localhost:3000>.

> **Subdomain routing caveat.** Portal gates in [`proxy.ts`](proxy.ts) key off the `Host` header
> (`jobs.` / `app.` / `admin.`). Plain `localhost` cannot exercise them — test those paths on real
> subdomains.

### Environment

Create `.env.local`. `npm run env:check` enforces the first three:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | **yes** | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | **yes** | Public anon key |
| `INSFORGE_SERVICE_KEY` | **yes** | Server-side key (`INSFORGE_ADMIN_KEY` is accepted as an alias) |
| `ADMIN_EMAILS` | for admin | Comma-separated allowlist for admin bootstrap |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute-URL generation |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | email | Outbound mail |
| `DAILY_API_KEY` | interviews | Daily.co video rooms |
| `MFA_SIGNING_SECRET` | admin MFA | TOTP signing |
| `ALLOW_MOCK_AUTH` | tests only | **Never set in production** — CI has a dedicated job asserting it is off |

Anything prefixed `NEXT_PUBLIC_` is shipped to the browser. `env:check` fails the build if a
secret-looking name carries that prefix.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (webpack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests — 14 files, 72 tests |
| `npm run test:coverage` | Tests with coverage thresholds enforced |
| `npm run e2e` | Playwright end-to-end |
| `npm run env:check` | Validate environment variables |
| `npm run docs:openapi` | Regenerate `docs/api/openapi.json` from `app/api/` |
| `npm run create-admin` | Bootstrap an admin account |

---

## Layout

```
app/            App Router — routes, pages, and 42 API routes under app/api/
components/     React components
lib/            Domain logic: api/ auth/ validation/ consent/ dpdp/ permissions
hooks/          React hooks
store/          Zustand state
insforge/       Backend: 81 SQL migrations + 54 edge functions
proxy.ts        Middleware — subdomain routing and portal gates
docs/           Documentation (start at docs/README.md)
__tests__/      Vitest unit tests
e2e/            Playwright specs
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.4** (App Router), React **19.2.3** |
| Language | TypeScript |
| Backend | InsForge SDK 1.5.2 — Postgres + RLS, auth, edge functions, storage |
| UI | MUI 7, Tailwind CSS, CSS Modules, Radix, Framer Motion |
| Data | TanStack Query · Zustand · Zod 4 |
| Editor | Tiptap |
| Video / scheduling | Daily.co · Cal.com embed |
| Email | Resend · nodemailer |
| Testing | Vitest · Playwright |

---

## API

42 routes under `app/api/`. The OpenAPI spec at [`docs/api/openapi.json`](docs/api/openapi.json) is
**generated from source** — run `npm run docs:openapi`, don't hand-edit it.

Auth is a **session cookie** (`tm_access_token`), not a bearer header. Routes wrapped in `withApi()`
([`lib/api/handler.ts`](lib/api/handler.ts)) declare their roles and Zod schemas in one place, and
the generator reads authorization rules from that same declaration — so the spec reflects what is
actually enforced.

---

## Scope — read before assuming a feature exists

V1 is a **single-recruiter-per-company ATS**. Deliberately **not** in it: AI matching, interview
scheduling, offer management, and outbound invitations. The `interviews`, `offers`, and `nvites`
tables have never held a row and are deferred to v1.1.

The full decision and its evidence: [`docs/specs/41_V1_Scope_Lock_And_V2_Plan.md`](docs/specs/41_V1_Scope_Lock_And_V2_Plan.md).

**Working today:** job post/edit/publish/expire, job templates, per-job applicants, a 7-stage
drag-to-move pipeline, candidate drawer and saved candidates, company registration with admin
approval, settings and company profile.

---

## Known caveats

1. **The CI `e2e` and `security-mock-auth-off` jobs have never run.** The `test` job they depend on
   failed on every execution until 2026-08-05. Expect real failures the first time they run.
2. **Coverage thresholds are a ratchet, not a target.** `lib/**` sits near 30% lines; the thresholds
   in `vitest.config.ts` are set just under that to prevent regression. Raise them as tests land.
3. **Production DDL has been applied out-of-band.** `insforge/migrations/` is not a complete record
   of live schema — verify against the live database before trusting a schema document.

---

© TalentMesh 2024–2026 · Private
