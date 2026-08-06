import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { requireStaff, getServiceClient } from '../_shared/adminAuth.ts';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    let db: any;

    // Gate 1: Try CRON_SECRET (for scheduled/external invocations)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') || '';

    if (cronSecret && token && timingSafeEqual(token, cronSecret)) {
      db = getServiceClient();
    } else if (token) {
      // Gate 2: Fall through to staff session auth (for admin UI)
      const auth = await requireStaff(request, { resource: 'settings', action: 'edit' });
      if (auth instanceof Response) return auth;
      db = auth.db;
    } else {
      return errorJson('unauthorized', 'Unauthorized', 401, cors);
    }

    const workerId = `edge-worker-${Math.random().toString(36).substring(2, 15)}`;

    const { data: lockAcquired } = await db.database.rpc('claim_cleanup_lock', {
      job_name_val: 'cleanup_storage_physical',
      worker_val: workerId
    });

    if (!lockAcquired) {
      return errorJson('conflict', 'Failed to acquire lock', 423, cors);
    }

    let restoredCount = 0;
    let deletedCount = 0;

    try {
      const { data: items } = await db.database
        .from('storage_quarantine')
        .select('*')
        .in('status', ['restoring', 'deleted']);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.bucket_name === 'resumes') {
            let shouldRemove = false;

            if (item.status === 'restoring') {
              const { data: blob } = await db.storage.from('resumes').download(item.file_path);
              if (blob) {
                await db.storage.from('resumes').upload(item.original_path, blob);
                shouldRemove = true;

                await db.database
                  .from('storage_quarantine')
                  .update({ status: 'restored', restored_at: new Date().toISOString() })
                  .eq('id', item.id);
                
                restoredCount++;
              }
            } else if (item.status === 'deleted') {
              shouldRemove = true;

              await db.database
                .from('storage_quarantine')
                .delete()
                .eq('id', item.id);

              deletedCount++;
            }

            if (shouldRemove) {
              await db.storage.from('resumes').remove(item.file_path);
            }
          }
        }
      }

      await db.database.rpc('log_cleanup_telemetry', {
        job_name_val: 'cleanup_storage_physical',
        deleted_count_val: deletedCount,
        duration_ms_val: 0
      });

    } finally {
      await db.database.rpc('release_cleanup_lock', {
        job_name_val: 'cleanup_storage_physical',
        worker_val: workerId
      });
    }

    return json({ success: true, restoredCount, deletedCount }, 200, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
