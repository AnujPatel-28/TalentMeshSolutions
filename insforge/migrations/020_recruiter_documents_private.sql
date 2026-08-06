-- Migration 020: recruiter_documents bucket security hardening
-- Converts bucket to private, enables storage RLS, and restricts access to project_admin.

-- 1. Ensure recruiter_documents bucket exists and is set to private
INSERT INTO storage.buckets (name, public)
VALUES ('recruiter_documents', false)
ON CONFLICT (name) DO UPDATE SET public = false;

-- 2. Drop old permissive policies if they exist
DROP POLICY IF EXISTS "Admin can do all with recruiter documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload recruiter documents" ON storage.objects;

-- 3. Explicitly enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Create storage RLS policies for recruiter_documents bucket allowing project_admin only
DROP POLICY IF EXISTS recruiter_documents_admin_policy ON storage.objects;
CREATE POLICY recruiter_documents_admin_policy ON storage.objects FOR ALL TO project_admin
USING ( bucket = 'recruiter_documents' )
WITH CHECK ( bucket = 'recruiter_documents' );
