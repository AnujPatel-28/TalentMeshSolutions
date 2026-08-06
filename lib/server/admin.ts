import { insforgeAdmin } from '@/lib/insforge-admin';

/**
 * lib/server/admin.ts
 * Server-only admin utilities using service role for elevated access.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/server/admin.ts can only be used on the server.');
}

export async function getAdminAlerts() {
  if (!insforgeAdmin) throw new Error('Admin client not initialized');

  const [
    { count: pendingRecruiters },
    { count: pendingJobs },
    { count: reportedJobs }, // Assuming a 'reported' status or flag exists, if not, 0 for now
    { count: newUsers24h }
  ] = await Promise.all([
    insforgeAdmin.database
      .from('recruiter_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false),
    insforgeAdmin.database
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false),
    insforgeAdmin.database
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'reported'),
    insforgeAdmin.database
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    pendingRecruiters: pendingRecruiters || 0,
    pendingJobs: pendingJobs || 0,
    reportedJobs: reportedJobs || 0,
    newUsers24h: newUsers24h || 0
  };
}

export async function getRecentActivity(limit = 10) {
  if (!insforgeAdmin) throw new Error('Admin client not initialized');

  const { data, error } = await insforgeAdmin.database
    .from('activity')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, limit - 1);

  if (error) throw new Error(`Activity fetch failed: ${error.message}`);
  return data;
}

export async function getPlatformSettings(key: string) {
  if (!insforgeAdmin) throw new Error('Admin client not initialized');

  const { data, error } = await insforgeAdmin.database
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  // PGRST116: no rows found
  // 42P01: relation does not exist
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') { 
    throw new Error(`Settings fetch failed: ${error.message}`);
  }
  return data?.value || null;
}

export async function updatePlatformSettings(key: string, value: any) {
  if (!insforgeAdmin) throw new Error('Admin client not initialized');

  const { error } = await insforgeAdmin.database
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw new Error(`Settings update failed: ${error.message}`);
}

export async function listAdmins() {
  if (!insforgeAdmin) throw new Error('Admin client not initialized');

  const { data, error } = await insforgeAdmin.database
    .from('profiles')
    .select('id, name, email, role, created_at')
    .in('role', ['admin', 'super_admin'])
    .order('name');

  if (error) throw new Error(`Admin fetch failed: ${error.message}`);
  return data;
}

export async function logAudit(actorId: string, action: string, tableName: string, recordId: string, oldData: any, newData: any, ip: string) {
  if (!insforgeAdmin) return; // Silent fail for audit logging in this context

  await insforgeAdmin.database
    .from('audit_log')
    .insert([{
      actor_id: actorId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ip
    }]);
}
