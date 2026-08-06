-- Migration 016: Storage RLS Policies for resumes bucket
-- Target: storage.objects

-- 1. SELECT (Read)
DROP POLICY IF EXISTS resumes_select ON storage.objects;
CREATE POLICY resumes_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket = 'resumes' AND split_part(key, '/', 1) = auth.uid()::text
);

-- 2. INSERT (Upload)
DROP POLICY IF EXISTS resumes_insert ON storage.objects;
CREATE POLICY resumes_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket = 'resumes' AND split_part(key, '/', 1) = auth.uid()::text
);

-- 3. UPDATE (Modify)
DROP POLICY IF EXISTS resumes_update ON storage.objects;
CREATE POLICY resumes_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket = 'resumes' AND split_part(key, '/', 1) = auth.uid()::text
) WITH CHECK (
  bucket = 'resumes' AND split_part(key, '/', 1) = auth.uid()::text
);

-- 4. DELETE (Remove)
DROP POLICY IF EXISTS resumes_delete ON storage.objects;
CREATE POLICY resumes_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket = 'resumes' AND split_part(key, '/', 1) = auth.uid()::text
);
