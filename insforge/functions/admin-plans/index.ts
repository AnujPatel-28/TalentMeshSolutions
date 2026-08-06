// @ts-nocheck — Deno edge function
import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

const planSchema = z.object({
  name: z.string().min(2).max(60),
  tagline: z.string().max(200).optional().default(''),
  price_monthly_inr: z.number().int().nonnegative().nullable(),
  price_annual_inr: z.number().int().nonnegative().nullable(),
  active_jobs: z.number().int().min(1).nullable(),
  recruiter_seats: z.number().int().min(1).nullable(),
  ai_calls_per_month: z.number().int().nonnegative().nullable(),
  is_popular: z.boolean().default(false),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
  cta_label: z.string().max(80).optional().default('Get Started'),
  cta_url: z.string().max(200).optional().default(''),
});

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  try {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'plans', action: 'view' }, cors);
      if (denied) return denied;

      const { data, error } = await db.database
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return json(data || [], 200, cors);
    }

    if (request.method === 'POST') {
      const denied = checkPermission(role, { resource: 'plans', action: 'edit' }, cors);
      if (denied) return denied;

      const body = await request.json();
      const planKey = body.key;
      if (!planKey || typeof planKey !== 'string') {
        return errorJson('invalid_request', 'Plan key is required', 400, cors);
      }

      const parsed = planSchema.safeParse(body);
      if (!parsed.success) {
        return errorJson('validation_error', 'Invalid plan data', 400, cors, parsed.error.format());
      }

      const planData = parsed.data;

      if (planData.is_popular) {
        // Enforce mutual exclusion: set all other plans to not popular
        const { error: clearError } = await db.database
          .from('subscription_plans')
          .update({ is_popular: false })
          .neq('key', planKey);
        if (clearError) throw clearError;
      }

      const { data, error } = await db.database
        .from('subscription_plans')
        .insert([{
          key: planKey,
          ...planData,
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return json({ success: true, plan: data?.[0] }, 201, cors);
    }

    if (request.method === 'PATCH') {
      const denied = checkPermission(role, { resource: 'plans', action: 'edit' }, cors);
      if (denied) return denied;

      const body = await request.json();
      const planKey = url.searchParams.get('key') || body.key;
      if (!planKey) {
        return errorJson('invalid_request', 'Plan key is required', 400, cors);
      }

      const parsed = planSchema.partial().safeParse(body);
      if (!parsed.success) {
        return errorJson('validation_error', 'Invalid plan data', 400, cors, parsed.error.format());
      }

      const planData = parsed.data;

      if (planData.is_popular === true) {
        // Enforce mutual exclusion: set all other plans to not popular
        const { error: clearError } = await db.database
          .from('subscription_plans')
          .update({ is_popular: false })
          .neq('key', planKey);
        if (clearError) throw clearError;
      }

      const { data, error } = await db.database
        .from('subscription_plans')
        .update({
          ...planData,
          updated_at: new Date().toISOString()
        })
        .eq('key', planKey)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return errorJson('not_found', 'Plan not found', 404, cors);
      }

      return json({ success: true, plan: data[0] }, 200, cors);
    }

    if (request.method === 'DELETE') {
      const denied = checkPermission(role, { resource: 'plans', action: 'delete' }, cors);
      if (denied) return denied;

      const body = await request.json().catch(() => ({}));
      const planKey = url.searchParams.get('key') || body.key;
      if (!planKey) {
        return errorJson('invalid_request', 'Plan key is required', 400, cors);
      }

      const { data, error } = await db.database
        .from('subscription_plans')
        .delete()
        .eq('key', planKey)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return errorJson('not_found', 'Plan not found', 404, cors);
      }

      return json({ success: true, message: 'Plan deleted' }, 200, cors);
    }

    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
