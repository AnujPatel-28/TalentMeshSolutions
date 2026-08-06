# Storage RLS Policies — Technical Audit Report

**Feature Area:** Shared Infrastructure  
**Audit Date:** 2026-06-09  
**Audited By:** External technical review  
**Status:** 🔴 Critical — Missing policies blocking all client uploads

---

## 1. Summary

The `resumes` (private) and `avatars` (public) storage buckets have **no policies defined** on `storage.objects`. This means:

- Any client-side upload to `resumes` bucket fails with `403 Forbidden`
- Avatar uploads fail even though the bucket is public (INSERT still requires a policy)
- Downloads of private resumes may fail depending on how the storage server enforces RLS

---

## 2. Required SQL Policies

Run this as `insforge/migrations/010_storage_rls.sql` in the SQL editor:

```sql
-- ================================================================
-- Migration 010: Storage RLS Policies for resumes and avatars
-- ================================================================

-- RESUMES BUCKET (private)
-- Read: owner, admin, or recruiter with an active application using this resume
CREATE POLICY "resumes_select" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'resumes' AND (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.candidate_resumes cr ON cr.id = a.resume_id
      WHERE cr.file_url LIKE '%' || name AND j.recruiter_id = auth.uid()
    )
  )
);

-- Upload: owner only (user-id must be first path segment)
CREATE POLICY "resumes_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'resumes' AND split_part(name, '/', 1) = auth.uid()::text
);

-- Delete: owner only
CREATE POLICY "resumes_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'resumes' AND split_part(name, '/', 1) = auth.uid()::text
);

-- AVATARS BUCKET (public read, owner write/delete)
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text
);
```

---

## 3. Storage Path Convention

All uploads must follow the user-id prefix convention:

```
resumes/{user-uuid}/{timestamp}_{filename}.pdf
avatars/{user-uuid}/avatar.jpg
```

This ensures the `split_part(name, '/', 1) = auth.uid()::text` check works correctly.

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-09 | Initial audit — policies missing from both buckets | System |
