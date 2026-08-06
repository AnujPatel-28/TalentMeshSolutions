# InsForge Support Q&A Context

**Date:** 29 July 2026

This document preserves the questions asked by TalentMesh Solutions and the responses provided by the InsForge support team.

It is intended to be used as context when generating legal documents. It intentionally does not paraphrase or interpret the responses.

---

## Question 1 — PostgreSQL Backup Retention

### Question

What is the retention period for automated PostgreSQL backups?

What is the retention period for PostgreSQL WAL (Write-Ahead Log) files used for point-in-time recovery?

### InsForge Response

1a. Automated backups are retained for 7 days. Manual backups are retained indefinitely until explicitly deleted by the project admin.

1b. Point-in-time recovery is not currently offered. WAL files are not archived for recovery purposes — they are automatically recycled by the database engine (typically within minutes to hours), so no long-lived WAL copies containing deleted data exist.

---

## Question 2 — Object Storage

### Question

When an object (for example, a candidate resume) is permanently deleted from Object Storage:

- Is it immediately removed from active storage?
- For how long may copies remain in backups before they are permanently purged?

### InsForge Response

2. Yes. Deletion is a synchronous hard delete of both the object metadata and the object bytes at the origin — there is no soft-delete, trash, or version retention on our side. Object contents are also never included in database backups. Two notes: (a) CDN edge caches may serve an already-cached copy until the cache TTL / signed-URL expiry (≤1 hour for private buckets, ≤7 days for public buckets); (b) if your application needs an undelete window, you can implement soft-delete at the application level.

---

## Question 3 — Database Record Deletion

### Question

When we permanently delete a database record (for example, to fulfill a user's account deletion request):

After what maximum period will that deleted data no longer exist in encrypted backups?

### InsForge Response

3. A deleted record disappears from automated backups when the last backup containing it expires — at most 7 days after deletion. Manual backups you create are retained until you delete them, so when fulfilling an erasure request you should also delete or refresh any manual backups containing that data.

---

## Question 4 — Backup Retention Configuration

### Question

Is backup retention configurable by customers, or is it fixed by InsForge?

If configurable, what retention options are currently available?

### InsForge Response

4. Backup retention is currently fixed platform-wide. Configurable retention is on our roadmap; we're happy to discuss your requirements.

---

## Question 5 — Documentation

### Question

Are these retention periods documented anywhere in the official InsForge documentation or Trust Center?

If so, could you please share the relevant link?

### InsForge Response

5. A dedicated retention document doesn't exist yet — some related information is in our FAQ (e.g., the 30-day restore window for paused free projects). We're consolidating backup and retention policies into official documentation and will share the link when it's live.