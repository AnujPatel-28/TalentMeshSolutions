import { createClient } from 'npm:@insforge/sdk';
import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';

const jobFilterSchema = z.object({
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  salary_min: z.coerce.number().min(0).optional(),
  salary_max: z.coerce.number().min(0).optional(),
  date_posted: z.enum(['all', '24h', '7d', '30d']).optional(),
});

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('API_KEY') || '';

  if (req.method === 'GET') {
    try {
      const dbClient = createClient({ 
        baseUrl, 
        anonKey: serviceKey || anonKey,
        isServerMode: true
      });
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams.entries());
      const validation = jobFilterSchema.safeParse(params);

      if (!validation.success) {
        return errorJson('invalid_request', 'Invalid query parameters', 400, cors, validation.error.flatten().fieldErrors);
      }

      const filters = validation.data;
      const page = filters.page || 0;
      const limit = capLimit(String(filters.limit), 100, 20);
      const start = page * limit;
      const end = start + limit - 1;

      let query = dbClient.database
        .from('jobs')
        .select('*, companies!inner(id, name, logo_url, industry, about:description, website)', { count: 'exact' })
        .eq('is_approved', true)
        .eq('status', 'active')
        // service-key client bypasses RLS jobs_select_approved, so its companies.status
        // condition must be restated here or unverified companies' jobs reach the public board
        .eq('companies.status', 'verified')
        .order('created_at', { ascending: false });

      if (filters.search) {
        const search = escapeOrFilter(filters.search);
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.location) {
        const loc = escapeOrFilter(filters.location);
        query = query.ilike('location', `%${loc}%`);
      }
      if (filters.salary_min) {
        query = query.gte('salary_min', filters.salary_min);
      }
      if (filters.salary_max) {
        query = query.lte('salary_max', filters.salary_max);
      }
      if (filters.date_posted && filters.date_posted !== 'all') {
        const now = new Date();
        if (filters.date_posted === '24h') now.setHours(now.getHours() - 24);
        else if (filters.date_posted === '7d') now.setDate(now.getDate() - 7);
        else if (filters.date_posted === '30d') now.setDate(now.getDate() - 30);
        query = query.gte('created_at', now.toISOString());
      }

      const { data, error, count } = await query.range(start, end);
      if (error) throw error;

      return json({
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        }
      }, 200, cors);

    } catch (err) {
      return internalError(cors, err);
    }
  }

  return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
}
