-- 065_data_principal_requests.sql
--
-- Doc ref: 26_Legal_DPDP_Compliance_Handoff.md, L-4 (Data Principal rights: access/correction/
-- erasure). Human applies -- never an agent (standing project rule, doc 25 §5 / doc 26 §7.2).
-- Apply as a SINGLE LINE via `insforge db query` -- the Windows CLI shim truncates multi-line
-- input at the first newline and still prints "Query executed successfully" (doc 26 §6).
--
-- ══ Deviations from doc 26 §5's draft schema (verified live 2026-07-29) ═══════════════════════
--
-- 1. `user_id` stays nullable / ON DELETE SET NULL, exactly as §5 proposed -- that part of the
--    draft was correct. `email` is carried too (§5 omitted it) so a request survives an erased
--    account the same way 063 made `consent_records.email` durable.
--
-- 2. §5 did NOT specify RLS for staff read access beyond "staff read all". That is not how staff
--    reads work anywhere else in this codebase: app/api/admin/verification/queue/route.ts reads
--    company_verification_requests through the SERVICE KEY inside a withApi-gated route, because
--    a platform admin's own JWT has no DB-level staff-read grant -- only the `project_admin`
--    Postgres role (service key) bypasses RLS. Given that precedent, this table gets the SAME
--    shape as consent_records (063): user SELECTs own rows, project_admin bypasses, no staff-read
--    RLS policy at all. Staff reads happen in app/api/admin/dpdp/queue/route.ts via insforgeAdmin.
--
-- 3. Writes (INSERT to raise a request, UPDATE to action/close it) go through the service key
--    only -- same append-then-service-write pattern as consent_records / app/api/consent*. No
--    INSERT/UPDATE/DELETE policy for authenticated/anon, AND the table-level grant is revoked too
--    (062's lesson, reapplied by 063: RLS with no matching policy already denies the command, but
--    the grant is revoked as well so the boundary does not rest on RLS alone).
--
-- ══ Erasure's actual hazard -- verified live 2026-07-29, informs why NO row this feature writes
-- ever deletes a `profiles`/`candidate_profiles`/`recruiter_profiles` row (see lib/dpdp/erasure.ts
-- for the full per-table plan; this is the one fact that makes "anonymise, never delete the
-- identity row" a technical necessity and not just a caution) ═══════════════════════════════════
--   SELECT tc.table_name, kcu.column_name, rc.delete_rule FROM information_schema.table_constraints
--     tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
--     JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
--     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
--     WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='profiles' AND ccu.column_name='id';
--   -> 46 rows. Two are load-bearing for this migration:
--     * jobs.recruiter_id is NOT NULL (get-table-schema, live) but its FK delete_rule is SET NULL.
--       Deleting a profiles row for any recruiter who has ever posted a job does not cascade --
--       it raises a NOT NULL constraint violation. There is no delete-based erasure path for a
--       recruiter; anonymise-in-place is the only option that doesn't error.
--     * applications_candidate_id_fkey (-> candidate_profiles) AND
--       applications_candidate_user_id_fkey (-> profiles) are BOTH ON DELETE CASCADE. Deleting
--       either identity row destroys the application row and, with it, the recruiter-owned
--       columns (stage_index, recruiter_notes, ai_match_score, rejection_reason) that doc 26 §4
--       explicitly says erasure must not touch. This is why applications are anonymised
--       (candidate-owned columns nulled) in place, never deleted, and why candidate_profiles /
--       profiles are never deleted either -- deleting either is the same failure by a different
--       cascade path.
--   consent_records.user_id -> profiles(id) ON DELETE CASCADE (063) is the third finding: if a
--   profiles row is ever deleted by some OTHER path (see 11_..._Report / this session's finding
--   on `profiles_self_delete`, out of scope for this migration), the statutory proof of consent
--   for that user is destroyed with it. Fixed below regardless of the "never delete profiles"
--   design, as defense in depth -- 063 spent 40 lines making `email` durable for exactly this
--   reason, and a CASCADE FK undoes that.
--
-- Post-apply verification to run (read-only):
--   SELECT column_name, is_nullable FROM information_schema.columns
--     WHERE table_name='data_principal_requests' ORDER BY ordinal_position;
--   SELECT polname, polcmd, roles FROM pg_policies WHERE tablename='data_principal_requests';
--   SELECT grantee, privilege_type FROM information_schema.table_privileges
--     WHERE table_name='data_principal_requests' AND grantee IN ('authenticated','anon');
--     -- expect ONLY SELECT
--   SELECT confdeltype FROM pg_constraint WHERE conname = 'consent_records_user_id_fkey';
--     -- expect 'n' (SET NULL), was 'c' (CASCADE)

BEGIN;

CREATE TABLE IF NOT EXISTS public.data_principal_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email          text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('access','correction','erasure','grievance')),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','rejected')),
  details        text,
  response_notes text,
  handled_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at         timestamptz NOT NULL, -- grievance: created_at + 90 days (statutory, doc 26 §2).
                                        -- access/correction/erasure: created_at + 30 days -- DPDP
                                        -- sets no fixed clock for these three; 30 days is chosen
                                        -- to match GDPR Art.12(3)'s one-month baseline (doc 26 L-9
                                        -- wants the DPDP/GDPR purpose plumbing to map cleanly) and
                                        -- to be operationally realistic for a small team. Computed
                                        -- in app/api/dpdp/requests/route.ts at insert time, not by
                                        -- a DB default -- the rule differs by `kind`.
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS dpr_status_due_idx ON public.data_principal_requests (status, due_at);
CREATE INDEX IF NOT EXISTS dpr_user_idx ON public.data_principal_requests (user_id, created_at DESC);

ALTER TABLE public.data_principal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bypass ON public.data_principal_requests;
CREATE POLICY admin_bypass ON public.data_principal_requests TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS dpr_select_own ON public.data_principal_requests;
CREATE POLICY dpr_select_own ON public.data_principal_requests FOR SELECT USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.data_principal_requests FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.data_principal_requests FROM anon;

-- Defense in depth for the statutory consent trail: an erasure/deletion of the identity row must
-- never destroy the record that lawful basis was ever granted. See the finding above.
ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;
ALTER TABLE public.consent_records
  ADD CONSTRAINT consent_records_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;

-- ══ ONE-LINE FORM TO APPLY (single line -- do not reformat) ════════════════════════════════════
-- BEGIN; CREATE TABLE IF NOT EXISTS public.data_principal_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, email text NOT NULL, kind text NOT NULL CHECK (kind IN ('access','correction','erasure','grievance')), status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','rejected')), details text, response_notes text, handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, due_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz); CREATE INDEX IF NOT EXISTS dpr_status_due_idx ON public.data_principal_requests (status, due_at); CREATE INDEX IF NOT EXISTS dpr_user_idx ON public.data_principal_requests (user_id, created_at DESC); ALTER TABLE public.data_principal_requests ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS admin_bypass ON public.data_principal_requests; CREATE POLICY admin_bypass ON public.data_principal_requests TO project_admin USING (true) WITH CHECK (true); DROP POLICY IF EXISTS dpr_select_own ON public.data_principal_requests; CREATE POLICY dpr_select_own ON public.data_principal_requests FOR SELECT USING (user_id = auth.uid()); REVOKE INSERT, UPDATE, DELETE ON public.data_principal_requests FROM authenticated; REVOKE INSERT, UPDATE, DELETE ON public.data_principal_requests FROM anon; ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey; ALTER TABLE public.consent_records ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL; COMMIT;
