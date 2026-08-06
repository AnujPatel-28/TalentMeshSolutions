"use server";

import { headers } from 'next/headers';
import { insforgeAdmin } from '@/lib/insforge-admin';

export async function logAction(params: {
  adminId: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldData?: object;
  newData?: object;
  status?: 'success' | 'failure';
}) {
    if (!insforgeAdmin) return;

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown';
    const userAgent = headersList.get('user-agent') ?? 'unknown';

    try {
        await insforgeAdmin.database.from('audit_log').insert([{
            actor_id: params.adminId,
            action: params.action,
            table_name: params.tableName,
            record_id: params.recordId,
            old_data: params.oldData || null,
            new_data: params.newData || null,
            ip_address: ip,
            user_agent: userAgent,
            status: params.status || 'success',
            created_at: new Date().toISOString()
        }]);
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
