import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;
const serviceKey = getServiceKey();

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  try {
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const userId = authData.user.id;
    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey });

    // Fetch Candidate Profile
    const { data: profile, error: profileError } = await insforgeAdmin.database
      .from('candidate_profiles')
      .select('skills, headline')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      // Fallback: return generic active jobs if no profile
      const { data: jobs } = await insforgeAdmin.database
        .from('jobs')
        .select('*, companies(name, logo_url)')
        .eq('status', 'active')
        .limit(5);
      
      return new Response(JSON.stringify({ data: jobs || [] }), { 
        status: 200, 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

    const candidateSkills = profile.skills || [];
    
    // Fetch Jobs that match any skill
    // Note: PostgREST doesn't support complex overlap queries easily without RPC
    // We'll fetch active jobs and rank them in JS for now
    const { data: activeJobs } = await insforgeAdmin.database
      .from('jobs')
      .select('*, companies(name, logo_url)')
      .eq('status', 'active')
      .limit(50);


    const rankedJobs = (activeJobs || []).map(job => {
      const jobSkills = job.skills_required || [];
      const matchingSkills = jobSkills.filter((s: string) => candidateSkills.includes(s));
      const score = (matchingSkills.length / Math.max(1, jobSkills.length)) * 100;
      return { ...job, matchScore: score, match_score: score };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    return new Response(JSON.stringify({ data: rankedJobs }), { 
      status: 200, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Recommendations Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
