// Server-side CSV export for candidates + recruiters (doc 14 R-8, D-19, FR-4).
// Replaces the ~250-line browser-orchestrated export duplicated in both directory pages:
// the whole build-and-upload now runs here, in one place, and is audited.
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission, getUserClient } from '../_shared/adminAuth.ts';
import type { Resource } from '../_shared/permissions.ts';

// ponytail: whole export runs synchronously inside this one request/response instead of a
// decoupled worker (like notification-worker). Fine at this dataset size; if a tenant's
// candidate/recruiter count outgrows a single invocation, move to a claim-and-resume worker
// the same way R-11's notification fan-out does.
const MAX_EXPORT_ROWS = 5000;

type ExportEntity = 'candidates' | 'recruiters';
type ExportFilters = { search?: string; status?: string; sort?: string };

function sortColumn(sort: string | undefined): { orderField: string; ascending: boolean } {
  if (sort === 'oldest') return { orderField: 'created_at', ascending: true };
  if (sort === 'name_asc') return { orderField: 'name', ascending: true };
  if (sort === 'name_desc') return { orderField: 'name', ascending: false };
  return { orderField: 'created_at', ascending: false };
}

async function fetchCandidateRows(db: any, filters: ExportFilters): Promise<{ rows: any[]; total: number }> {
  let query = db.database.from('profiles').select('*, candidate_profiles(*)', { count: 'exact' }).eq('role', 'candidate');
  if (filters.search) {
    const term = escapeOrFilter(filters.search);
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { orderField, ascending } = sortColumn(filters.sort);
  const { data, count, error } = await query.order(orderField, { ascending }).range(0, MAX_EXPORT_ROWS - 1);
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

async function fetchRecruiterRows(db: any, filters: ExportFilters): Promise<{ rows: any[]; total: number }> {
  let query = db.database.from('profiles').select('*', { count: 'exact' }).eq('role', 'recruiter');
  if (filters.search) {
    const term = escapeOrFilter(filters.search);
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  const { orderField, ascending } = sortColumn(filters.sort);
  const { data, count, error } = await query.order(orderField, { ascending }).range(0, MAX_EXPORT_ROWS - 1);
  if (error) throw error;

  const profiles = data || [];
  const profileIds = profiles.map((p: any) => p.id);
  let recruiterProfiles: any[] = [];
  if (profileIds.length > 0) {
    const { data: rpData, error: rpError } = await db.database
      .from('recruiter_profiles')
      .select('*, companies(*)')
      .in('id', profileIds);
    if (rpError) throw rpError;
    recruiterProfiles = rpData || [];
  }

  const rows = profiles.map((p: any) => ({
    ...p,
    recruiter_profiles: recruiterProfiles.filter((rp) => rp.id === p.id),
  }));
  return { rows, total: count || 0 };
}

const CANDIDATE_HEADERS = ['Name', 'Email', 'Location', 'Headline', 'Skills', 'Status', 'Active', 'Joined Date'];

function candidateToRow(c: any): string[] {
  const p = Array.isArray(c.candidate_profiles) ? c.candidate_profiles[0] : c.candidate_profiles;
  return [
    c.name || 'Anonymous',
    c.email,
    c.location || 'Remote',
    p?.headline || '',
    (p?.skills || []).join('; '),
    c.status,
    c.is_active ? 'Yes' : 'No',
    new Date(c.created_at).toLocaleDateString('en-IN'),
  ];
}

const RECRUITER_HEADERS = ['Name', 'Email', 'Company', 'Industry', 'Size', 'Approved', 'Active', 'Joined Date'];

function recruiterToRow(r: any): string[] {
  const p = Array.isArray(r.recruiter_profiles) ? r.recruiter_profiles[0] : r.recruiter_profiles;
  return [
    r.name || 'Anonymous',
    r.email,
    p?.company_name || 'Individual',
    p?.industry || '',
    p?.company_size || '',
    p?.is_approved ? 'Yes' : 'No',
    r.is_active ? 'Yes' : 'No',
    new Date(r.created_at).toLocaleDateString('en-IN'),
  ];
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

async function runExport(db: any, userClient: any, userId: string, entity: ExportEntity, filters: ExportFilters, jobId: string): Promise<{ total: number }> {
  const workerId = `server-${userId}`;
  const { data: isClaimed, error: claimErr } = await userClient.database.rpc('claim_export_job', {
    job_id: jobId,
    worker_id: workerId,
  });
  if (claimErr || !isClaimed) {
    throw new Error('Failed to claim export job');
  }

  const { rows, total } = entity === 'candidates'
    ? await fetchCandidateRows(db, filters)
    : await fetchRecruiterRows(db, filters);

  try {
    await db.database.from('audit_log').insert([{
      actor_id: userId,
      action: 'export_started',
      table_name: 'export_jobs',
      record_id: jobId,
      metadata: { entity, filters, expected_row_count: total },
      created_at: new Date().toISOString(),
    }]);
  } catch (e) {
    console.warn('Failed to insert audit log entry:', e);
  }

  await db.database.from('export_jobs').update({
    total_count: rows.length,
    processed_count: 0,
    progress_percent: 0,
  }).eq('id', jobId);

  const headers = entity === 'candidates' ? CANDIDATE_HEADERS : RECRUITER_HEADERS;
  const toRow = entity === 'candidates' ? candidateToRow : recruiterToRow;
  const csvRows: string[][] = [];
  const chunkSize = Math.max(1, Math.ceil(rows.length / 5)); // 5 progress updates, same cadence as the old client worker
  let processed = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    csvRows.push(...chunk.map(toRow));
    processed = Math.min(rows.length, processed + chunk.length);
    await db.database.from('export_jobs').update({
      processed_count: processed,
      progress_percent: rows.length ? Math.round((processed / rows.length) * 100) : 100,
    }).eq('id', jobId);
  }

  const csv = toCsv(headers, csvRows);
  const file = new File([new Blob(['﻿' + csv], { type: 'text/csv' })], `export-${jobId}.csv`);

  const { error: uploadErr } = await db.storage.from('export-candidates').upload(`jobs/${jobId}.csv`, file);
  if (uploadErr) throw uploadErr;
  const { data: urlData } = db.storage.from('export-candidates').getPublicUrl(`jobs/${jobId}.csv`);
  const downloadUrl = urlData?.publicUrl || '';

  await db.database.from('export_jobs').update({
    status: 'completed',
    download_url: downloadUrl,
    completed_at: new Date().toISOString(),
    locked_by: null,
    locked_at: null,
  }).eq('id', jobId);

  try {
    await db.database.from('audit_log').insert([{
      actor_id: userId,
      action: 'export_completed',
      table_name: 'export_jobs',
      record_id: jobId,
      metadata: { entity, row_count: rows.length },
      created_at: new Date().toISOString(),
    }]);
  } catch (e) {
    console.warn('Failed to insert audit log entry:', e);
  }

  return { total: rows.length };
}

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db, userId } = auth;

  if (request.method !== 'POST') {
    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
  }

  try {
    const body = await request.json();
    const { action, jobId } = body;

    if (action === 'status') {
      if (!jobId) return errorJson('invalid_request', 'jobId is required', 400, cors);

      const { data: exportJob, error } = await db.database.from('export_jobs').select('*').eq('id', jobId).single();
      if (error || !exportJob) return errorJson('not_found', 'Export job not found', 404, cors);

      const denied = checkPermission(role, { resource: exportJob.type as Resource, action: 'view' }, cors);
      if (denied) return denied;

      const state = exportJob.status === 'completed' ? 'done'
        : exportJob.status === 'failed' ? 'failed'
        : exportJob.status === 'running' ? 'running'
        : 'pending';

      return json({
        state,
        progress: (exportJob.progress_percent || 0) / 100,
        downloadUrl: state === 'done' ? exportJob.download_url : undefined,
        error: state === 'failed' ? exportJob.error_message : undefined,
      }, 200, cors);
    }

    if (action !== 'start') {
      return errorJson('invalid_request', "action must be 'start' or 'status'", 400, cors);
    }

    const { entity } = body;
    if (entity !== 'candidates' && entity !== 'recruiters') {
      return errorJson('invalid_request', "entity must be 'candidates' or 'recruiters'", 400, cors);
    }

    const denied = checkPermission(role, { resource: entity, action: 'export' }, cors);
    if (denied) return denied;

    const idempotencyKey = request.headers.get('x-idempotency-key');
    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    const rawFilters = body.filters || {};
    const filters: ExportFilters = {
      search: typeof rawFilters.search === 'string' ? rawFilters.search : undefined,
      status: typeof rawFilters.status === 'string' ? rawFilters.status : undefined,
      sort: typeof rawFilters.sort === 'string' ? rawFilters.sort : 'newest',
    };

    try {
      const { data: jobRow, error: jobErr } = await db.database
        .from('export_jobs')
        .insert([{ user_id: userId, status: 'pending', type: entity, filters }])
        .select('id')
        .single();
      if (jobErr || !jobRow) throw jobErr || new Error('Failed to create export job');
      const jobId = jobRow.id as string;

      try {
        const authHeader = request.headers.get('Authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const userClient = getUserClient(token);
        await runExport(db, userClient, userId, entity, filters, jobId);
      } catch (runErr: any) {
        await db.database.from('export_jobs').update({
          status: 'failed',
          error_message: runErr?.message || 'Export failed',
          completed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        }).eq('id', jobId);
        throw runErr;
      }

      const resPayload = { jobId };
      await completeIdempotency(db, idempotencyKey, 202, resPayload);
      return json(resPayload, 202, cors);
    } catch (workError) {
      await releaseIdempotency(db, idempotencyKey);
      throw workError;
    }
  } catch (error) {
    return internalError(cors, error);
  }
}
