import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

interface NotificationJob {
  id: string;
  user_id: string;
  template_id: string | null;
  channel: 'in_app' | 'email' | 'push';
  status: string;
  priority: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  dedupe_key: string | null;
  retry_count: number;
  last_error: string | null;
}

interface NotificationTemplate {
  id: string;
  key: string;
  channels: string[];
  title_template: string;
  body_template: string;
  allowed_variables: string[];
}

function safeInterpolate(template: string, payload: Record<string, any>, allowed: string[]): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (allowed.includes(trimmedKey)) {
      const val = payload[trimmedKey];
      return val !== undefined ? String(val) : '';
    } else {
      return ''; // Safe fallback for non-whitelisted or missing fields
    }
  });
}

function isInQuietHours(startStr: string, endStr: string): boolean {
  try {
    const now = new Date();
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Over midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch {
    return false;
  }
}

function getQuietHoursEnd(endStr: string): Date {
  const now = new Date();
  const [endH, endM] = endStr.split(':').map(Number);
  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);
  if (end <= now) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

export default async function handler(req: Request): Promise<Response> {
  const INSFORGE_URL = getBaseUrl();
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: cors });
  }

  try {
    const serviceKey = getServiceKey();
    const db = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: serviceKey,
      isServerMode: true
    });

    // 1. Claim a notification job using worker leasing
    const workerId = `worker-${crypto.randomUUID()}`;
    const leaseDuration = '60 seconds';
    
    console.log(`Worker ${workerId} claiming next notification job...`);
    const { data: claimData, error: claimError } = await db.database.rpc('claim_notification_job', {
      worker_id: workerId,
      lease_duration: leaseDuration
    });

    if (claimError) {
      throw claimError;
    }

    const job: NotificationJob = Array.isArray(claimData) ? claimData[0] : claimData;
    if (!job) {
      return new Response(JSON.stringify({ success: true, message: 'No pending notification jobs found.' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully claimed job: ${job.id} for user ${job.user_id}`);

    if (job.payload?.type === 'announcement_fanout') {
      const announcement_id = job.payload.announcement_id;
      const target_roles = job.payload.target_roles || [];
      const last_processed_user_id = job.payload.last_processed_user_id;
      const processed_count = job.payload.processed_count || 0;
      let total_count = job.payload.total_count;

      console.log(`Processing announcement fan-out job ${job.id} for announcement ${announcement_id}`);

      if (total_count === undefined || total_count === null) {
        const { count, error: countErr } = await db.database
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', target_roles);
        
        if (countErr) throw countErr;
        total_count = count ?? 0;
      }

      const startTime = Date.now();
      const TIME_LIMIT_MS = 20000;
      let currentLastId = last_processed_user_id;
      let currentProcessed = processed_count;
      let hasMore = true;
      const BATCH_SIZE = 100;

      while (hasMore && (Date.now() - startTime < TIME_LIMIT_MS)) {
        let profileQuery = db.database
          .from('profiles')
          .select('id')
          .in('role', target_roles);

        if (currentLastId) {
          profileQuery = profileQuery.gt('id', currentLastId);
        }

        const { data: batchProfiles, error: profileErr } = await profileQuery
          .order('id', { ascending: true })
          .limit(BATCH_SIZE);

        if (profileErr) throw profileErr;

        if (!batchProfiles || batchProfiles.length === 0) {
          hasMore = false;
          break;
        }

        const newNotifications = batchProfiles.map((p: any) => ({
          user_id: p.id,
          title: job.title,
          message: job.message.replace(/\*\*/g, ''),
          type: 'info',
          is_read: false,
          metadata: { announcement_id, job_id: job.id },
          created_at: new Date().toISOString()
        }));

        const newReceipts = batchProfiles.map((p: any) => ({
          notification_job_id: job.id,
          user_id: p.id,
          read_at: null,
          clicked_at: null,
          dismissed_at: null,
          created_at: new Date().toISOString()
        }));

        const { error: insertNotifErr } = await db.database.from('notifications').insert(newNotifications);
        if (insertNotifErr) throw insertNotifErr;

        const { error: insertReceiptErr } = await db.database.from('notification_receipts').insert(newReceipts);
        if (insertReceiptErr) throw insertReceiptErr;

        currentProcessed += batchProfiles.length;
        currentLastId = batchProfiles[batchProfiles.length - 1].id;

        if (batchProfiles.length < BATCH_SIZE) {
          hasMore = false;
        }

        const updatedPayload = {
          type: 'announcement_fanout',
          announcement_id,
          target_roles,
          processed_count: currentProcessed,
          total_count: total_count,
          last_processed_user_id: currentLastId
        };

        if (!hasMore) {
          await db.database.from('notification_jobs')
            .update({
              status: 'delivered',
              payload: updatedPayload,
              sent_at: new Date().toISOString(),
              delivered_at: new Date().toISOString(),
              locked_by: null,
              locked_at: null,
              lease_expires_at: null,
              heartbeat_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          await db.database.from('notification_events').insert([{
            job_id: job.id,
            event_type: 'delivered',
            metadata: { channel: job.channel, type: 'announcement_fanout' }
          }]);
        } else {
          await db.database.from('notification_jobs')
            .update({
              payload: updatedPayload,
              lease_expires_at: new Date(Date.now() + 60000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }
      }

      if (hasMore) {
        await db.database.from('notification_jobs')
          .update({
            status: 'pending',
            locked_by: null,
            locked_at: null,
            lease_expires_at: null,
            heartbeat_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Processed fan-out job ${job.id}. Progress: ${currentProcessed}/${total_count}`
      }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 2. Fetch User Notification Preferences
    const { data: prefs, error: prefsError } = await db.database
      .from('notification_preferences')
      .select('*')
      .eq('user_id', job.user_id)
      .single();


    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 is single row empty
      throw prefsError;
    }

    // Default preferences if none found
    const emailEnabled = prefs?.email_enabled !== false;
    const pushEnabled = prefs?.push_enabled !== false;
    const quietHours = prefs?.quiet_hours || { enabled: false, start: '22:00', end: '08:00' };

    // 3. Check Channel Specific Enablers
    if (job.channel === 'email' && !emailEnabled) {
      await db.database.from('notification_jobs')
        .update({ status: 'expired', last_error: 'Channel disabled by user preferences', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      return new Response(JSON.stringify({ success: true, message: `Job ${job.id} expired: channel disabled by user.` }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (job.channel === 'push' && !pushEnabled) {
      await db.database.from('notification_jobs')
        .update({ status: 'expired', last_error: 'Channel disabled by user preferences', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      return new Response(JSON.stringify({ success: true, message: `Job ${job.id} expired: channel disabled by user.` }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 4. Quiet Hours Check & Deferral
    if (quietHours.enabled && isInQuietHours(quietHours.start, quietHours.end)) {
      const resumeTime = getQuietHoursEnd(quietHours.end).toISOString();
      console.log(`User ${job.user_id} is in quiet hours. Deferring job ${job.id} until ${resumeTime}`);
      
      await db.database.from('notification_jobs')
        .update({
          status: 'throttled',
          next_attempt_at: resumeTime,
          locked_by: null,
          locked_at: null,
          lease_expires_at: null,
          heartbeat_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      await db.database.from('notification_events').insert([{
        job_id: job.id,
        event_type: 'throttled',
        metadata: { reason: 'deferred_due_to_quiet_hours', resume_at: resumeTime }
      }]);

      return new Response(JSON.stringify({ success: true, message: `Job ${job.id} deferred due to quiet hours.` }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 5. Template Interpolation
    let finalTitle = job.title;
    let finalBody = job.message;

    if (job.template_id) {
      const { data: template, error: tempError } = await db.database
        .from('notification_templates')
        .select('*')
        .eq('id', job.template_id)
        .single();

      if (!tempError && template) {
        const t: NotificationTemplate = template;
        finalTitle = safeInterpolate(t.title_template, job.payload, t.allowed_variables);
        finalBody = safeInterpolate(t.body_template, job.payload, t.allowed_variables);
      }
    }

    // 6. Deliver Notification
    let deliverySuccess = false;
    let deliveryError = '';

    if (job.channel === 'in_app') {
      try {
        // Insert into core notifications table
        const { error: notifInsertError } = await db.database
          .from('notifications')
          .insert([{
            user_id: job.user_id,
            title: finalTitle,
            message: finalBody,
            type: job.priority === 'critical' || job.priority === 'high' ? 'error' : 'info',
            is_read: false,
            metadata: { job_id: job.id }
          }]);

        if (notifInsertError) throw notifInsertError;

        // Insert into receipts table
        const { error: receiptInsertError } = await db.database
          .from('notification_receipts')
          .insert([{
            notification_job_id: job.id,
            user_id: job.user_id,
            read_at: null,
            clicked_at: null,
            dismissed_at: null
          }]);

        if (receiptInsertError) throw receiptInsertError;

        deliverySuccess = true;
      } catch (err: any) {
        deliveryError = err.message || 'Failed to insert in-app notification';
      }
    } else if (job.channel === 'email') {
      // Mock email sending
      console.log(`[MOCK EMAIL] Sending to user ${job.user_id}: Title: "${finalTitle}" Body: "${finalBody}"`);
      deliverySuccess = true;
    } else if (job.channel === 'push') {
      // Mock push sending
      console.log(`[MOCK PUSH] Sending to user ${job.user_id}: Title: "${finalTitle}" Body: "${finalBody}"`);
      deliverySuccess = true;
    }

    // 7. Update Job Status & Event Lifecycle
    if (deliverySuccess) {
      await db.database.from('notification_jobs')
        .update({
          status: 'delivered',
          title: finalTitle,
          message: finalBody,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
          lease_expires_at: null,
          heartbeat_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      await db.database.from('notification_events').insert([{
        job_id: job.id,
        event_type: 'delivered',
        metadata: { channel: job.channel }
      }]);

      return new Response(JSON.stringify({ success: true, message: `Job ${job.id} delivered successfully.` }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } else {
      // Handle Failure & Retries
      const nextAttempt = new Date();
      nextAttempt.setMinutes(nextAttempt.getMinutes() + (job.retry_count + 1) * 2); // Exponential retry delay (2m, 4m, 6m)
      
      const newRetryCount = job.retry_count + 1;
      const isPermanentlyFailed = newRetryCount >= 3;
      const newStatus = isPermanentlyFailed ? 'failed' : 'pending';

      await db.database.from('notification_jobs')
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          last_error: deliveryError,
          next_attempt_at: isPermanentlyFailed ? null : nextAttempt.toISOString(),
          locked_by: null,
          locked_at: null,
          lease_expires_at: null,
          heartbeat_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      await db.database.from('notification_events').insert([{
        job_id: job.id,
        event_type: isPermanentlyFailed ? 'failed' : 'retry',
        metadata: { attempt: newRetryCount, error: deliveryError }
      }]);

      return new Response(JSON.stringify({ success: false, error: deliveryError }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('notification-worker error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
