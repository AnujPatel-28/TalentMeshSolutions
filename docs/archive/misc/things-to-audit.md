----------------------------------------
THINGS TO AUDIT
----------------------------------------

# 1 Authentication Architecture

Understand the complete authentication lifecycle.

Map the flow.

Example

Unauthenticated User

↓

Login

↓

OAuth

↓

Backend

↓

Cookie creation

↓

Session

↓

Middleware

↓

Protected Routes

↓

Refresh

↓

Logout

↓

Token cleanup

↓

Redirect

↓

Expired Session

↓

Unauthorized

↓

Recovery

Understand every step.

Produce a complete authentication flow diagram.

----------------------------------------

# 2 Session Management

Validate

How sessions are created

How sessions are refreshed

How sessions expire

Session invalidation

Multiple devices

Concurrent login

Session fixation protection

Session hijacking protection

Session rotation

Remember me behaviour

Idle timeout

Absolute timeout

Revoked sessions

Cookie lifetime

Cookie renewal

Cookie deletion

----------------------------------------

# 3 Cookie Security

Verify every cookie.

Check

HttpOnly

Secure

SameSite

Domain

Path

Expiration

Rotation

Cross subdomain behaviour

Multi tenant compatibility

Production configuration

Local configuration

Check whether cookies can leak.

----------------------------------------

# 4 OAuth Flow

Audit Google OAuth.

Audit LinkedIn OAuth.

Check

state parameter

nonce

PKCE

redirect URI validation

callback validation

open redirect vulnerabilities

account linking

duplicate accounts

OAuth replay attacks

email verification

provider mismatch

provider removal

provider switching

----------------------------------------

# 5 Authorization

Understand

RBAC

Permission checks

Route protection

API protection

Server Actions

Client Components

Middleware

InsForge RLS

Tenant isolation

Cross tenant access

Privilege escalation

Admin impersonation

Unauthorized access

----------------------------------------

# 6 Middleware

Audit every middleware.

Check

Authentication

Authorization

Redirect loops

Performance

Edge Runtime compatibility

Caching

Header forwarding

Matcher configuration

Route bypasses

Protected APIs

Protected server actions

----------------------------------------

# 7 Next.js Best Practices

Validate whether authentication follows current Next.js best practices.

Check

Server Components

Client Components

Route Handlers

Server Actions

Middleware

Caching

Dynamic rendering

Streaming

Edge Runtime compatibility

Request memoization

Auth checks inside layouts

Auth checks inside pages

----------------------------------------

# 8 InsForge Integration

Audit integration with InsForge.

Check

Session validation

JWT verification

Refresh handling

Token storage

Server SDK usage

Client SDK usage

Service role usage

Anonymous access

RLS enforcement

Database access

Privilege boundaries

Edge Functions

----------------------------------------

# 9 Security Review

Look for

CSRF

XSS

Session fixation

Replay attacks

Broken Authentication

Broken Access Control

IDOR

Privilege escalation

Open Redirect

Token leakage

Cookie leakage

Sensitive logging

Timing attacks

Brute force protection

Rate limiting

Password reset vulnerabilities

Email verification issues

OAuth abuse

Enumeration attacks

Race conditions

Clickjacking

Security headers

CORS

Secrets exposure

Environment variable misuse

JWT validation

----------------------------------------

# 10 Edge Cases

Think like an attacker.

Find edge cases.

Examples

Google account email changes

LinkedIn email changes

Deleted Google account

Deleted LinkedIn account

OAuth callback replay

Expired callback

Session expires during request

Multiple tabs

Browser refresh

Logout from another device

Expired refresh token

Account already exists

Same email different provider

Tenant deleted

Recruiter removed

Company suspended

Permission changes during active session

Role downgrade

Network interruption

Server restart

Clock skew

Duplicate OAuth callback

Race conditions

Concurrent login

----------------------------------------

# 11 Production Readiness

Determine

Is this production ready?

Would you personally deploy this?

If not

Why not?

Blockers

Major Risks

Minor Risks

Future Improvements

Technical Debt

----------------------------------------

# 12 Performance

Audit authentication performance.

Check

Repeated auth queries

Duplicate session fetches

Unnecessary middleware work

Excessive database calls

OAuth latency

Caching opportunities

Server Component optimization

Hydration issues

Re-render triggers

Memory usage

Cold start concerns

----------------------------------------

# 13 Architecture Review

Review whether the architecture itself is correct.

Recommend improvements if another architecture would be more scalable.

Do not redesign unless necessary.

Only recommend changes backed by reasoning.

----------------------------------------

# 14 Code Quality

Review

Folder structure

Naming

Separation of concerns

Reusability

Abstractions

Single responsibility

Coupling

Testability

Maintainability

----------------------------------------

OUTPUT FORMAT

Create a professional audit report.

Executive Summary

Architecture Overview

Authentication Flow

Session Lifecycle

OAuth Lifecycle

Cookie Analysis

Authorization Review

Middleware Review

InsForge Review

Security Findings

Performance Findings

Edge Cases

Production Readiness Score

Critical Issues

High Issues

Medium Issues

Low Issues

Recommended Improvements

Deployment Checklist

Final Verdict

For every finding include

Severity

Evidence

Code Location

Explanation

Recommended Fix

Confidence

Never invent findings.

Never assume.

If you cannot prove something from the implementation,
say so.

Think like someone performing a security audit before approving a production deployment.

Be skeptical.

Verify everything.