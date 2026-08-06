# ADR-00X: Separate Authentication Entry Points

## Status

Proposed

---

# Context

The TalentMesh platform serves three fundamentally different user groups:

1. Candidates
2. Recruiters (Company Users)
3. TalentMesh Platform Administrators

Although all users authenticate using the same identity provider, their responsibilities, permissions, security requirements, and application experiences are fundamentally different.

The question is whether all users should share a single login page or whether each audience should have its own authentication entry point.

---

# Decision

The platform SHALL expose three independent authentication entry points.

```
jobs.talentmeshsolutions.com/login
```

Candidate Portal

```
company.hrms.talentmeshsolutions.com/login
```

Recruiter Portal (tenant aware)

```
admin.talentmeshsolutions.com/login
```

Platform Administration

Each login page is optimized for its intended audience while sharing the same authentication backend.

This is a routing decision only.

It does NOT imply three different authentication systems.

---

# Why Separate Login Pages?

## Different User Intent

Candidates are trying to find jobs.

Recruiters are trying to manage hiring.

Platform admins operate the SaaS itself.

Showing one universal login creates unnecessary friction because every audience sees options that are irrelevant to them.

---

## Security Isolation

Platform administration is significantly more sensitive than recruiter access.

Admin users can:

- approve companies
- suspend recruiters
- access platform analytics
- modify platform configuration
- manage billing
- perform moderation
- access audit logs

These capabilities require additional security measures such as:

- mandatory MFA
- stronger session policies
- stricter monitoring
- audit logging
- optional IP restrictions

Keeping the admin portal isolated reduces accidental exposure and simplifies security policies.

---

## Company Branding

Recruiters should authenticate inside their company's workspace.

Example

```
acme.hrms.talentmeshsolutions.com/login
```

instead of

```
talentmeshsolutions.com/login
```

This allows:

- company branding
- company logo
- company colors
- tenant detection
- future SSO support

without affecting candidate or admin experiences.

---

## Better Product Experience

Each login page can present only the features relevant to its audience.

Candidate

- Google Login
- Create Account
- Forgot Password

Recruiter

- Company Sign In
- Invitation Acceptance
- Password Reset

Admin

- Email
- Password
- MFA Challenge

No unnecessary buttons or navigation.

---

# Should the Admin Route Be Hidden?

No.

The architecture assumes that attackers can discover the URL.

Security MUST NOT rely on hiding endpoints.

The admin route is intentionally public but protected.

Example:

```
admin.talentmeshsolutions.com
```

Anyone can reach the login page.

Only authenticated platform administrators may proceed.

If authentication succeeds but the account lacks the Platform Admin role:

Return:

```
403 Forbidden
```

The user must never receive administrator privileges simply because they discovered the route.

---

# Authentication Flow

```
Visitor
        │
        ▼
Admin Login Page
        │
Authenticate
        │
        ▼
Role Verification
        │
 ┌──────┴────────┐
 │               │
Platform Admin   Not Platform Admin
 │               │
 ▼               ▼
MFA            403 Forbidden
 │
 ▼
Admin Dashboard
```

---

# Authentication Backend

The three portals SHOULD share one authentication provider.

Recommended model:

```
users
```

Master identity

```
candidate_profiles
```

Candidate-specific information

```
recruiter_profiles
```

Recruiter-specific information

```
admin_profiles
```

Platform administrator information

Authorization is determined by role and profile, not by which login page was used.

---

# Advantages

- Cleaner UX
- Clear separation of concerns
- Easier future SSO integration
- Independent security policies
- Independent branding
- Simpler routing
- Better audit logging
- Reduced accidental privilege exposure

---

# Potential Drawbacks

- Three login pages to maintain
- Additional routing logic
- Slightly more deployment configuration

These drawbacks are minor compared to the security and UX benefits.

---

# Recommendation

Adopt separate authentication entry points for Candidates, Recruiters, and Platform Administrators while maintaining a single centralized authentication service and a unified authorization model.

The platform should assume every route is publicly discoverable and rely entirely on authentication, authorization, MFA, and audit logging for security rather than obscurity.

---

# Verification Against Current Implementation (2026-07-27)

The ADR above was checked against the live codebase. Three divergences must be
resolved before implementation:

| # | ADR says | Implementation actually has | Resolution |
|---|---|---|---|
| 1 | `company.hrms.talentmeshsolutions.com` per-tenant subdomains (`acme.hrms.…`) | Recruiter portal is a single `app.` subdomain (`proxy.ts:157`). No wildcard DNS, no tenant-by-host resolution anywhere. | Keep `app.` for launch. Per-tenant subdomains are a future branding/SSO phase (see [SUGGESTION] S-3). |
| 2 | `admin_profiles` / `candidate_profiles` / `recruiter_profiles` tables per audience | Authorization source of truth is `profiles.role` (`candidate` / `recruiter` / `admin` / `super_admin`), decided in doc 14. | Do NOT add per-audience profile tables. Authorization stays role-based; the ADR's "role and profile, not login page" principle is already satisfied. |
| 3 | Three login pages exist | ONE shared page `app/(auth)/login/page.tsx` renders on every host — Google + LinkedIn + email for all audiences, including `admin.`. `proxy.ts:165` lists `/admin/login` as an auth page but **no such page exists** (phantom route). | Implement per [SUGGESTION] S-1. |

Additional verified defect the ADR does not mention:

- **OAuth role inference by hostname** — `login/page.tsx:581` sets the OAuth
  `role` param from `window.location.hostname.startsWith('app.')`. On the
  `admin.` host the OAuth buttons render and would sign a user in with
  `role=candidate`. Hiding OAuth on the admin variant (S-1) removes this path.

What the ADR asks for that ALREADY exists (do not rebuild):

- Host-based portal detection: `proxy.ts:155-158`.
- Admin role gate + `/unauthorized` (the ADR's "403 Forbidden"): `proxy.ts:444-449`.
- Admin MFA challenge (`/auth/mfa-verify`, signed cookie): `proxy.ts:451-453` + `validateMfaCookie`.
- Admin-only password recovery pages: `app/admin/forgot-password`, `app/admin/reset-password`.
- Post-login role-based redirect to the correct subdomain: `login/page.tsx` `getDestinationUrl`.

---

# [SUGGESTION] S-1 — Implement as one login engine, three host-driven variants

**Rationale:** The ADR's benefit is three *experiences*, not three codebases. The
existing login page already reads `window.location.hostname` for redirects; the
cheapest correct implementation is to branch the same page on host and render a
per-portal variant. Three separate page trees would triplicate the OAuth
callback handling, redirect logic, MFA handoff, and skeleton UI that took
multiple sessions to harden.

**Variant matrix (drives rendering — this is the whole feature).**
*(Decided 2026-07-27: recruiter OAuth removed — recruiter access is manually
verified (doc 25 / recruiter-manual-verification), so OAuth adds an unverified
entry path with no UX benefit. Recruiter login = email + password + reset only.)*

| | Candidate (`jobs.` + main domain) | Recruiter (`app.`) | Admin (`admin.`) |
|---|---|---|---|
| Google OAuth | ✅ | ❌ | ❌ |
| LinkedIn OAuth | ✅ | ❌ | ❌ |
| Email + password | ✅ | ✅ (only method) | ✅ (only method) |
| Signup link | → `/signup/candidate` | "Register your company" → recruiter request-access flow (`/signup/recruiter`) | ❌ none |
| Forgot password | `/forgot-password` | `/forgot-password` | `/admin/forgot-password` |
| MFA step | — | — | existing `/auth/mfa-verify` after password |
| Heading / copy | "Find your next job" | "Company sign in" | "Platform administration" |

**Navbar entry point (decided 2026-07-27):** on the main/public domain, the
single `Login` link in `components/layout/Navbar/Navbar.tsx` becomes a
two-option dropdown — "Candidate" → `jobs.<domain>/login`, "Recruiter" →
`app.<domain>/login`. No admin option: the admin team knows the `admin.`
domain; the route stays public-but-protected per this ADR (not advertised ≠
hidden-for-security). Mobile menu gets the same two links. Fix the existing
`href="\signup"` backslash bug in the mobile block while editing it.

**Server-side changes:** none required. `proxy.ts` already routes `/login` on
every host. Optionally remove the phantom `/admin/login` entry from `authPages`
(`proxy.ts:165`) or make it a redirect to `/login` on the `admin.` host —
either way the doc/route mismatch stops existing.

**Client-side changes:** in `app/(auth)/login/page.tsx`, derive
`portal: 'candidate' | 'recruiter' | 'admin'` from hostname (same pattern the
file already uses), and gate the OAuth block, signup link, and copy on it.
Delete the hostname-based OAuth `roleParam` special-casing for admin by never
rendering OAuth there.

**Wrong-portal logins:** keep current behavior — authenticate, then redirect by
role (candidate logging in on `app.` lands on `jobs.` dashboard). This is
better UX than the ADR's 403 for non-admin audiences. The 403/`unauthorized`
outcome stays admin-portal-only, as already enforced by proxy + layout RSCs.

**Trade-offs:** one file with three variants is marginally less "separate" than
three page trees, but the security separation never lived in the page — it
lives in `proxy.ts` gates and layout RSC authorization, which are shared and
already verified. Revisit only if the variants' markup diverges enough that the
conditionals hurt.

**Deploy priority:** P2 (pre-launch polish + closes the admin-OAuth role hole).

---

# [SUGGESTION] S-2 — Admin login hardening scope

**Rationale:** the ADR's "mandatory MFA, stronger session policies" list should
not balloon into new systems. MFA challenge, signed MFA cookie, role gate, and
audit logging already exist. The only *new* admin-login work justified now:

- No OAuth, no signup on the admin variant (covered by S-1).
- Password policy fix (doc 25 §2 P2-1) applies platform-wide and is the real
  admin-credential hardening — it is already tracked; do not duplicate.

Defer IP allowlisting and session-length differentiation until there is more
than one real admin team. **Deploy priority:** folded into S-1.

---

# [SUGGESTION] S-3 — Per-tenant branded subdomains (`acme.hrms.…`): defer

**Rationale:** requires wildcard DNS + wildcard TLS through Cloudflare, a
host→company resolution step in `proxy.ts`, and per-company branding assets —
none of which exist, and no customer has asked. The single `app.` portal loses
nothing functionally. Revisit when the first enterprise customer requests SSO
or branded login. **Deploy priority:** P3 (post-launch).

---

# [SUGGESTION] S-4 — Structure login/signup variants as DPDP consent surfaces

**Rationale:** the deferred India DPDP work (doc 25 §3) will need granular,
unticked-by-default consent checkboxes and audience-specific notices — a
candidate consents to resume/profile processing, a recruiter consents on
behalf of a business (GSTIN/CIN data), and admin staff need none of it. Three
audience-specific entry points (S-1) make per-audience consent text a rendering
concern instead of a redesign. When the compliance work happens, the consent UI
lands in the signup variants; the login variants only link to the correct
audience-specific privacy notice.

⚠ Per doc 25 §3: consent/policy *text* must be researched against the current
operative DPDP rules at implementation time and reviewed by counsel — do not
write it from model knowledge, and do not write it as part of S-1.

**Deploy priority:** P2 gate before real users (tracked as doc 25 §2 P2-2).