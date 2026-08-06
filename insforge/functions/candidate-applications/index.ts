import { createClient } from 'npm:@insforge/sdk';
import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';

const createApplicationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  coverLetter: z.string().optional(),
  applyType: z.enum(['quick', 'manual']).default('quick'),
  resumeUrl: z.string().optional(),
  resumeId: z.string().uuid().optional().nullable(),
  screeningAnswers: z.record(z.string(), z.any()).optional(),
});

function getStorageKeyFromUrl(urlOrKey: string | null | undefined): string {
  if (!urlOrKey) return '';
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    try {
      const parsed = new URL(urlOrKey);
      const parts = parsed.pathname.split('/objects/');
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
    } catch {
      // fallback
    }
  }
  return urlOrKey;
}

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY') || '';

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  const insforge = createClient({ baseUrl, anonKey, edgeFunctionToken: token || '', isServerMode: true });
  
  let candidateId: string | null = null;
  if (token) {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (authData?.user && authData.user.id !== 'project-admin-with-api-key') {
      candidateId = authData.user.id;
    }
  }

  // Every method here acts as a specific candidate, so the identity check belongs here rather than
  // inside a branch. It used to live only inside `if (req.method === 'GET')`, which left POST
  // completely unauthenticated: an anonymous caller reached the service-role client below and could
  // drive a storage download/upload against the private resumes bucket with a key of their
  // choosing. Guarding here also stops an unauthenticated caller consuming an idempotency slot.
  if (!candidateId) {
    return errorJson('unauthorized', 'You must be logged in.', 401, cors);
  }

  const insforgeAdmin = createClient({
    baseUrl, 
    anonKey: serviceKey,
    isServerMode: true
  });

  const idempotencyKey = req.headers.get('x-idempotency-key');

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const jobId = url.searchParams.get('jobId');

      if (jobId) {
        const { data: existing, error: existingError } = await insforgeAdmin.database
          .from('applications')
          .select('id, status')
          .eq('candidate_id', candidateId)
          .eq('job_id', jobId)
          .neq('status', 'withdrawn')
          .maybeSingle();

        if (existingError || !existing) {
          return json({ status: null }, 200, cors);
        }

        return json({ status: existing.status, id: existing.id }, 200, cors);
      }

      const { data: applications, error: appsError } = await insforge.database
        .from('applications')
        .select('*, jobs(id, title, location, type, salary_min, salary_max, currency, companies(name, logo_url))')
        .eq('candidate_id', candidateId)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      return json({ applications: applications || [] }, 200, cors);
    }

    const idem = await beginIdempotency(insforgeAdmin, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (req.method === 'POST') {
        const payload = await req.json();
        const validation = createApplicationSchema.safeParse(payload);

        if (!validation.success) {
          return errorJson('invalid_request', 'Invalid application payload', 400, cors, validation.error.flatten().fieldErrors);
        }

        const input = validation.data;

        const { data: job, error: jobError } = await insforgeAdmin.database
          .from('jobs')
          .select('id, title, status, is_approved, applications_count')
          .eq('id', input.jobId)
          .single();

        if (jobError || !job) {
          return errorJson('not_found', 'Job not found', 404, cors);
        }

        let resumeUrl = input.resumeUrl;
        let resumeId = input.resumeId;

        if (!resumeUrl && candidateId) {
          const { data: profile } = await insforgeAdmin.database
            .from('candidate_profiles')
            .select('primary_resume_id')
            .eq('id', candidateId)
            .maybeSingle();

          if (profile?.primary_resume_id) {
            const { data: primaryResume } = await insforgeAdmin.database
              .from('candidate_resumes')
              .select('id, file_url')
              .eq('id', profile.primary_resume_id)
              .maybeSingle();

            if (primaryResume?.file_url) {
              resumeUrl = primaryResume.file_url;
              resumeId = primaryResume.id;
            }
          }

          if (!resumeUrl) {
            const { data: defaultResume } = await insforgeAdmin.database
              .from('candidate_resumes')
              .select('id, file_url')
              .eq('candidate_id', candidateId)
              .eq('is_default', true)
              .maybeSingle();

            if (defaultResume?.file_url) {
              resumeUrl = defaultResume.file_url;
              resumeId = defaultResume.id;
            }
          }

          if (!resumeUrl) {
            const { data: newestResume } = await insforgeAdmin.database
              .from('candidate_resumes')
              .select('id, file_url')
              .eq('candidate_id', candidateId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (newestResume?.file_url) {
              resumeUrl = newestResume.file_url;
              resumeId = newestResume.id;
            }
          }

          if (!resumeUrl) {
            const { data: legacyProfile } = await insforgeAdmin.database
              .from('candidate_profiles')
              .select('resume_url')
              .eq('id', candidateId)
              .maybeSingle();

            if (legacyProfile?.resume_url) {
              resumeUrl = legacyProfile.resume_url;
            }
          }
        }

        const applicationId = crypto.randomUUID();
        let snapshotKey: string | null = null;
        let snapshotUrl: string | null = null;

        if (resumeUrl) {
          try {
            const originalKey = getStorageKeyFromUrl(resumeUrl);
            if (originalKey) {
              const { data: fileBlob, error: downloadError } = await insforgeAdmin.storage
                .from('resumes')
                .download(originalKey);

              if (downloadError || !fileBlob) {
                return errorJson('snapshot_download_failed', `Failed to download original resume: ${downloadError?.message || 'Empty file'}`, 500, cors);
              }

              const MAX_SIZE = 5 * 1024 * 1024;
              if (fileBlob.size > MAX_SIZE) {
                return errorJson('snapshot_file_too_large', 'File too large. Resume must be less than 5MB.', 400, cors);
              }

              const keyLower = originalKey.toLowerCase();
              const isLegacyDoc = keyLower.endsWith('.doc') || keyLower.endsWith('.docx');

              if (isLegacyDoc) {
                const ext = keyLower.endsWith('.docx') ? '.docx' : '.doc';
                snapshotKey = `applications/${applicationId}/resume${ext}`;
              } else {
                if (!keyLower.endsWith('.pdf')) {
                  return errorJson('invalid_file_type', 'Only PDF resumes are supported.', 400, cors);
                }

                const allowedMimeTypes = ['application/pdf', 'application/octet-stream', 'binary/octet-stream', ''];
                if (!allowedMimeTypes.includes(fileBlob.type)) {
                  return errorJson('invalid_mime_type', 'Only PDF resumes are supported.', 400, cors);
                }

                const bytes = new Uint8Array(await fileBlob.slice(0, 5).arrayBuffer());
                const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D;
                
                if (!isPdf) {
                  return errorJson('invalid_pdf_file', 'Only PDF resumes are supported.', 400, cors);
                }

                snapshotKey = `applications/${applicationId}/resume.pdf`;
              }

              const { data: uploadData, error: uploadError } = await insforgeAdmin.storage
                .from('application-snapshots')
                .upload(snapshotKey, fileBlob);

              if (uploadError || !uploadData) {
                return errorJson('snapshot_upload_failed', `Failed to upload resume snapshot: ${uploadError?.message}`, 500, cors);
              }
              snapshotUrl = uploadData.url;
            }
          } catch (err: any) {
            console.error('[candidate-applications] Resume snapshot failed:', err.message);
            return errorJson('snapshot_unexpected_error', `Resume snapshot error: ${err.message}`, 500, cors);
          }
        }

        const now = new Date().toISOString();
        let application: any = null;
        try {
          const { data, error: applyError } = await insforgeAdmin.database
            .from('applications')
            .insert([{
              id: applicationId,
              job_id: input.jobId,
              candidate_id: candidateId,
              cover_letter: input.coverLetter || null,
              status: 'applied',
              applied_at: now,
              updated_at: now,
              apply_type: input.applyType,
              resume_url: snapshotUrl || resumeUrl || null,
              resume_id: resumeId || null,
              resume_snapshot_key: snapshotKey || null,
              screening_answers: input.screeningAnswers || null,
            }])
            .select()
            .single();

          if (applyError || !data) {
            throw applyError || new Error('Failed to insert application');
          }
          application = data;
        } catch (dbError: any) {
          console.error('[candidate-applications] Database insert failed, rolling back storage snapshot:', dbError.message);
          if (snapshotKey) {
            await insforgeAdmin.storage
              .from('application-snapshots')
              .remove(snapshotKey);
          }
          
          let friendlyMessage = dbError.message || 'Unknown database error';
          if (dbError.code === '23505' || friendlyMessage.includes('idx_unique_candidate_job_application')) {
            friendlyMessage = 'You have already applied for this job.';
          }
          
          return errorJson('conflict', friendlyMessage, 400, cors);
        }

        const resPayload = { application };
        await completeIdempotency(insforgeAdmin, idempotencyKey, 201, resPayload);
        return json(resPayload, 201, cors);
      }

      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    } catch (workError) {
      await releaseIdempotency(insforgeAdmin, idempotencyKey);
      throw workError;
    }
  } catch (err) {
    return internalError(cors, err);
  }
}
