import { insforge } from '@/lib/insforge';

export const logAudit = async (userId: string, action: string, resource: string, details?: any) => {
  try {
    await insforge.database.from('audit_log').insert({
      actor_id: userId,
      action,
      table_name: resource,
      metadata: details
    });
  } catch (e) {
    console.error('Audit log failed', e);
  }
};
