import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return errorJson('unauthorized', 'Unauthorized', 401, cors);
  }

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY') || '';

  try {
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return errorJson('unauthorized', 'Unauthorized', 401, cors);
    }

    const userId = authData.user.id;
    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });

    if (req.method === 'GET') {
      const { data: profile, error: profileErr } = await insforgeAdmin.database
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      if (profileErr || !profile?.company_id) {
        return json({ company: null }, 200, cors);
      }

      const { data: company, error: compErr } = await insforgeAdmin.database
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (compErr) {
        throw compErr;
      }

      return json({ company }, 200, cors);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const idempotencyKey = req.headers.get('x-idempotency-key');
      const idem = await beginIdempotency(insforgeAdmin, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const body = await req.json();
        
        const { data: profile } = await insforgeAdmin.database
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .single();

        let company;

        if (profile?.company_id) {
          const { data, error } = await insforgeAdmin.database
            .from('companies')
            .update({
              name: body.name,
              industry: body.industry,
              website: body.website,
              logo_url: body.logo_url,
            })
            .eq('id', profile.company_id)
            .select()
            .single();

          if (error) throw error;
          company = data;
        } else {
          const { data, error } = await insforgeAdmin.database
            .from('companies')
            .insert([{
              name: body.name || 'My Company',
              industry: body.industry,
              website: body.website,
              logo_url: body.logo_url,
            }])
            .select()
            .single();

          if (error) throw error;
          company = data;

          if (company?.id) {
            const { error: profileUpdateErr } = await insforgeAdmin.database
              .from('profiles')
              .update({ company_id: company.id })
              .eq('id', userId);
            
            if (profileUpdateErr) throw profileUpdateErr;
          }
        }

        const resPayload = { company };
        await completeIdempotency(insforgeAdmin, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(insforgeAdmin, idempotencyKey);
        throw workError;
      }
    }

    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);

  } catch (err) {
    return internalError(cors, err);
  }
}
