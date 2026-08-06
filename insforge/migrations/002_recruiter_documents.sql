-- Add document URL to recruiter profiles
ALTER TABLE recruiter_profiles 
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create custom pricing proposals table
CREATE TABLE IF NOT EXISTS custom_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES profiles(id),
  features JSONB NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_proposals ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY admin_bypass_proposals ON custom_proposals TO project_admin USING (true) WITH CHECK (true);

-- Recruiters can view their own proposals
CREATE POLICY proposals_select_own ON custom_proposals FOR SELECT USING (auth.uid() = recruiter_id);

-- Storage bucket for recruiter documents
INSERT INTO storage.buckets (name, public) 
VALUES ('recruiter_documents', false)
ON CONFLICT (name) DO NOTHING;

-- Storage policies for recruiter documents
CREATE POLICY "Admin can do all with recruiter documents"
ON storage.objects FOR ALL TO project_admin
USING ( bucket = 'recruiter_documents' );

-- Note: We handle file uploads via edge functions which bypass RLS using the service role key,
-- so we don't necessarily need an insert policy for public users, but it's good practice.
CREATE POLICY "Anon can upload recruiter documents"
ON storage.objects FOR INSERT TO public
WITH CHECK ( bucket = 'recruiter_documents' );
