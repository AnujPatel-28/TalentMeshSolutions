import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;
const serviceKey = getServiceKey();

// Sliding window database-backed rate limiter
async function checkRateLimit(insforgeAdmin: any, userId: string): Promise<boolean> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);

  try {
    // 1. Delete expired entries for this user to keep database clean and small
    await insforgeAdmin.database
      .from('user_rate_limits')
      .delete()
      .eq('user_id', userId)
      .lt('timestamp', oneMinuteAgo.toISOString());

    // 2. Count requests in the last minute
    const { count, error } = await insforgeAdmin.database
      .from('user_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('timestamp', oneMinuteAgo.toISOString());

    if (error) {
      console.error('[resume-proxy] Rate limit check DB query error:', error.message);
      // Fallback: allow requests to avoid blocking users during DB hiccups
      return true;
    }

    if (count !== null && count >= 60) {
      return false;
    }

    // 3. Insert current request timestamp
    await insforgeAdmin.database
      .from('user_rate_limits')
      .insert([{ user_id: userId }]);

    return true;
  } catch (err) {
    console.error('[resume-proxy] Rate limit exception:', err);
    return true;
  }
}

// Extract relative file path from full URL
function getPathFromUrl(url: string, bucketName: string): string {
  if (!url) return '';
  const marker = `/${bucketName}/`;
  const index = url.indexOf(marker);
  let path = url;
  if (index !== -1) {
    path = url.substring(index + marker.length).split('?')[0];
  } else if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf(bucketName);
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        path = pathParts.slice(bucketIndex + 1).join('/');
      }
    } catch {}
  }
  if (path.startsWith('objects/')) {
    path = path.substring(8);
  }
  // Decode URI-encoded characters (e.g. %2F → /) so storage SDK receives a real path
  try {
    path = decodeURIComponent(path);
  } catch {}
  return path;
}

// Log audit events to database
async function logAuditEvent(
  insforgeAdmin: any, 
  userId: string, 
  companyId: string | null, 
  eventType: string, 
  resource: string, 
  reason: string | null, 
  requestId: string, 
  route: string
) {
  try {
    await insforgeAdmin.database
      .from('authorization_events')
      .insert([{
        user_id: userId,
        company_id: companyId || null,
        event_type: eventType,
        resource: resource,
        reason: reason || null,
        request_id: requestId,
        route: route,
      }]);
  } catch (err) {
    console.error('[resume-proxy] Failed to log audit event:', err);
  }
}

async function assertAuthenticated(insforge: any) {
  const { data: { user }, error: authError } = await insforge.auth.getCurrentUser();
  if (authError || !user) {
    throw new Error('401: Unauthorized');
  }
  return user;
}

async function assertAuthorized(
  insforgeAdmin: any, 
  user: any, 
  resumeId: string | null, 
  applicationId: string | null,
  route: string
) {
  // Fetch actor profile role
  const { data: profile, error: profileError } = await insforgeAdmin.database
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('403: Forbidden - User profile not found');
  }

  const isSystemAdmin = profile.role === 'admin' || profile.role === 'super_admin';
  if (isSystemAdmin) {
    if (applicationId) {
      const { data: appData } = await insforgeAdmin.database
        .from('applications')
        .select('id, candidate_id, resume_snapshot_key')
        .eq('id', applicationId)
        .single();
      if (!appData) throw new Error('404: Application not found');
      return { 
        candidateId: appData.candidate_id, 
        bucket: 'application-snapshots', 
        path: appData.resume_snapshot_key || `applications/${applicationId}/resume.pdf`, 
        source: 'admin' as const,
        companyId: profile.company_id
      };
    } else if (resumeId) {
      const { data: resumeData } = await insforgeAdmin.database
        .from('candidate_resumes')
        .select('id, candidate_id, file_url')
        .eq('id', resumeId)
        .maybeSingle();

      let candidateId = null;
      let fileUrl = null;

      if (resumeData) {
        candidateId = resumeData.candidate_id;
        fileUrl = resumeData.file_url;
      } else {
        // Fallback for legacy resume (stored in candidate_profiles.resume_url containing resumeId)
        const { data: legacyProfile } = await insforgeAdmin.database
          .from('candidate_profiles')
          .select('id, resume_url')
          .like('resume_url', `%${resumeId}%`)
          .maybeSingle();

        if (legacyProfile && legacyProfile.resume_url) {
          candidateId = legacyProfile.id;
          fileUrl = legacyProfile.resume_url;
        }
      }

      if (!candidateId || !fileUrl) {
        throw new Error('404: Resume not found');
      }

      return { 
        candidateId, 
        bucket: 'resumes', 
        path: getPathFromUrl(fileUrl, 'resumes'), 
        source: 'admin' as const,
        companyId: profile.company_id
      };
    }
    throw new Error('400: Missing resumeId or applicationId');
  }

  if (profile.role === 'candidate') {
    if (applicationId) {
      const { data: appData } = await insforgeAdmin.database
        .from('applications')
        .select('id, candidate_id, resume_snapshot_key')
        .eq('id', applicationId)
        .single();
      if (!appData) throw new Error('404: Application not found');
      if (appData.candidate_id !== user.id) {
        throw new Error('403: Forbidden - You do not own this application');
      }
      return { 
        candidateId: appData.candidate_id, 
        bucket: 'application-snapshots', 
        path: appData.resume_snapshot_key || `applications/${applicationId}/resume.pdf`, 
        source: null,
        companyId: profile.company_id
      };
    } else if (resumeId) {
      const { data: resumeData } = await insforgeAdmin.database
        .from('candidate_resumes')
        .select('id, candidate_id, file_url')
        .eq('id', resumeId)
        .maybeSingle();

      let candidateId = null;
      let fileUrl = null;

      if (resumeData) {
        candidateId = resumeData.candidate_id;
        fileUrl = resumeData.file_url;
      } else {
        // Fallback for legacy resume (stored in candidate_profiles.resume_url containing resumeId)
        const { data: legacyProfile } = await insforgeAdmin.database
          .from('candidate_profiles')
          .select('id, resume_url')
          .eq('id', user.id)
          .like('resume_url', `%${resumeId}%`)
          .maybeSingle();

        if (legacyProfile && legacyProfile.resume_url) {
          candidateId = legacyProfile.id;
          fileUrl = legacyProfile.resume_url;
        }
      }

      if (!candidateId || !fileUrl) {
        throw new Error('404: Resume not found');
      }

      if (candidateId !== user.id) {
        throw new Error('403: Forbidden - You do not own this resume');
      }

      return { 
        candidateId, 
        bucket: 'resumes', 
        path: getPathFromUrl(fileUrl, 'resumes'), 
        source: null,
        companyId: profile.company_id
      };
    }
    throw new Error('400: Missing resumeId or applicationId');
  }

  if (profile.role === 'recruiter') {
    if (!profile.company_id) {
      throw new Error('403: Forbidden - Recruiter is not associated with any company');
    }

    if (applicationId) {
      const { data: appData } = await insforgeAdmin.database
        .from('applications')
        .select('id, candidate_id, status, resume_snapshot_key, jobs(company_id)')
        .eq('id', applicationId)
        .single();
      if (!appData) throw new Error('404: Application not found');
      
      const jobCompanyId = Array.isArray(appData.jobs) ? appData.jobs[0]?.company_id : (appData.jobs as any)?.company_id;
      if (jobCompanyId !== profile.company_id) {
        throw new Error('403: Forbidden - Application belongs to a different company');
      }

      // Validate active application status
      const allowedStatuses = ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired'];
      if (!allowedStatuses.includes(appData.status)) {
        throw new Error(`403: Forbidden - Application status is '${appData.status}'`);
      }

      return { 
        candidateId: appData.candidate_id, 
        bucket: 'application-snapshots', 
        path: appData.resume_snapshot_key || `applications/${applicationId}/resume.pdf`, 
        source: 'application' as const,
        companyId: profile.company_id
      };
    } else if (resumeId) {
      const { data: resumeData } = await insforgeAdmin.database
        .from('candidate_resumes')
        .select('id, candidate_id, file_url')
        .eq('id', resumeId)
        .maybeSingle();

      let candidateId = null;
      let fileUrl = null;

      if (resumeData) {
        candidateId = resumeData.candidate_id;
        fileUrl = resumeData.file_url;
      } else {
        // Fallback for legacy resume
        const { data: legacyProfile } = await insforgeAdmin.database
          .from('candidate_profiles')
          .select('id, resume_url')
          .like('resume_url', `%${resumeId}%`)
          .maybeSingle();

        if (legacyProfile && legacyProfile.resume_url) {
          candidateId = legacyProfile.id;
          fileUrl = legacyProfile.resume_url;
        }
      }

      if (!candidateId || !fileUrl) {
        throw new Error('404: Resume not found');
      }

      // Validate recruiter has active candidate application linked to company with this resume
      const { data: apps, error: appError } = await insforgeAdmin.database
        .from('applications')
        .select('id, status, job_id, jobs!inner(company_id)')
        .eq('jobs.company_id', profile.company_id)
        .in('status', ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired'])
        .or(`resume_id.eq.${resumeId},resume_url.like.%${resumeId}%,resume_snapshot_key.like.%${resumeId}%`);

      if (appError || !apps || apps.length === 0) {
        throw new Error('403: Forbidden - No active application with this resume found for your company');
      }

      return { 
        candidateId, 
        bucket: 'resumes', 
        path: getPathFromUrl(fileUrl, 'resumes'), 
        source: 'talent_pool' as const,
        companyId: profile.company_id
      };
    }
    throw new Error('400: Missing resumeId or applicationId');
  }

  throw new Error('403: Forbidden - Invalid role');
}

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: cors });
  }

  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const route = url.pathname + url.search;
  
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...cors, 'X-Request-ID': requestId } 
    });
  }

  const reqBaseUrl = baseUrl;
  const reqAnonKey = anonKey;
  const reqServiceKey = serviceKey;

  const insforge = createClient({ baseUrl: reqBaseUrl, anonKey: reqAnonKey, isServerMode: true });
  insforge.setAccessToken(token);
  const insforgeAdmin = createClient({ baseUrl: reqBaseUrl, anonKey: reqServiceKey });

  const applicationId = url.searchParams.get('applicationId');
  const resumeId = url.searchParams.get('resumeId');
  const accessType = url.searchParams.get('accessType') === 'downloaded' ? 'downloaded' : 'viewed';
  
  const resource = resumeId ? `resume:${resumeId}` : `application:${applicationId}`;

  try {
    // 1. Authenticate
    const user = await assertAuthenticated(insforge);

    // 2. Rate limit check (60 req/min)
    if (!(await checkRateLimit(insforgeAdmin, user.id))) {
      await logAuditEvent(insforgeAdmin, user.id, null, 'rbac_denied', resource, 'Too Many Requests (Rate Limit)', requestId, route);
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), { 
        status: 429, 
        headers: { ...cors, 'X-Request-ID': requestId } 
      });
    }

    // 3. Authorize
    const resourceDetails = await assertAuthorized(insforgeAdmin, user, resumeId, applicationId, route);

    // 4. Log Audit Event for Recruiter or Admin access
    if (resourceDetails.source) {
      const eventType = accessType === 'downloaded' ? 'resume_download' : 'resume_view';
      await logAuditEvent(
        insforgeAdmin, 
        user.id, 
        resourceDetails.companyId, 
        eventType, 
        resource, 
        null, 
        requestId, 
        route
      );

      // Log historical compatibility resume log
      if (applicationId) {
        await insforgeAdmin.database
          .from('resume_access_log')
          .insert([{
            application_id: applicationId,
            candidate_id: resourceDetails.candidateId,
            recruiter_id: user.id,
            access_type: accessType,
            source: resourceDetails.source === 'admin' ? 'admin' : 'application',
          }]);
      }
    }

    // 5. Download from storage
    const { data: fileBlob, error: storageError } = await insforgeAdmin.storage
      .from(resourceDetails.bucket)
      .download(resourceDetails.path);

    if (storageError || !fileBlob) {
      console.error('[resume-proxy] Storage download failed:', storageError?.message);
      return new Response(JSON.stringify({ error: 'Resume file not found in storage.' }), { 
        status: 404, 
        headers: { ...cors, 'X-Request-ID': requestId } 
      });
    }

    // Resolve Content-Type & Content-Disposition
    const pathLower = resourceDetails.path.toLowerCase();
    let contentType = 'application/pdf';
    let filename = 'resume.pdf';
    let isAttachment = accessType === 'downloaded';

    if (pathLower.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = 'resume.docx';
      isAttachment = true;
    } else if (pathLower.endsWith('.doc')) {
      contentType = 'application/msword';
      filename = 'resume.doc';
      isAttachment = true;
    }

    return new Response(fileBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': isAttachment ? `attachment; filename="${filename}"` : 'inline',
        'Cache-Control': 'private, no-store',
        'Pragma': 'no-cache',
        'X-Request-ID': requestId,
      },
    });
  } catch (err: any) {
    const errMsg = err.message || 'Internal Server Error';
    console.error('[resume-proxy] Error:', errMsg);

    let statusCode = 500;
    let eventType = 'rbac_denied';
    
    if (errMsg.startsWith('401:')) {
      statusCode = 401;
    } else if (errMsg.startsWith('403:')) {
      statusCode = 403;
      if (errMsg.includes('Forbidden')) {
        eventType = resumeId ? 'unauthorized_resume_attempt' : 'rbac_denied';
        if (errMsg.includes('ownership') || errMsg.includes('applied')) {
          eventType = 'resume_enumeration_attempt';
        }
      }
    } else if (errMsg.startsWith('404:')) {
      statusCode = 404;
    }

    // Try to resolve user ID safely for log
    let userIdLog = 'anonymous';
    let companyIdLog = null;
    try {
      const { data: { user: u } } = await insforge.auth.getCurrentUser();
      if (u) {
        userIdLog = u.id;
        const { data: prof } = await insforgeAdmin.database.from('profiles').select('company_id').eq('id', u.id).single();
        companyIdLog = prof?.company_id;
      }
    } catch {}

    if (statusCode === 403 || statusCode === 401) {
      await logAuditEvent(insforgeAdmin, userIdLog, companyIdLog, eventType, resource, errMsg, requestId, route);
    }

    return new Response(JSON.stringify({ error: errMsg.replace(/^\d+:\s*/, '') }), { 
      status: statusCode, 
      headers: { ...cors, 'X-Request-ID': requestId } 
    });
  }
}
