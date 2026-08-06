import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY')!;
const serviceKey = getServiceKey();

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  // The presence of a token used to be the whole check, so `Authorization: Bearer x` reached the
  // service-role client below and returned job and candidate PII to anyone. Validate it, then
  // confirm the caller is a recruiter or staff — this endpoint reads another person's profile.
  // isServerMode is required: without it SDK 1.5.2's getCurrentUser() returns a null user in ~0ms
  // without ever calling the backend, and every caller would 401.
  const caller = createClient({ baseUrl, anonKey, isServerMode: true });
  caller.setAccessToken(token);
  const { data: authData, error: authError } = await caller.auth.getCurrentUser();
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  try {
    const { jobId, candidateId } = await req.json();

    if (!jobId || !candidateId) {
      return new Response(JSON.stringify({ error: 'jobId and candidateId required' }), { status: 400, headers: cors });
    }

    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });

    const { data: callerProfile } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!['recruiter', 'admin', 'super_admin'].includes(callerProfile?.role ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors });
    }

    // Fetch Job
    const { data: job, error: jobError } = await insforgeAdmin.database
      .from('jobs')
      .select('title, description, skills_required, requirements, location, type, experience_min, experience_max')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: cors });
    }

    // Fetch Candidate
    const { data: profile } = await insforgeAdmin.database
      .from('profiles')
      .select('name, about, location')
      .eq('id', candidateId)
      .single();

    const { data: candidate, error: candError } = await insforgeAdmin.database
      .from('candidate_profiles')
      .select('skills, experience_years, education, headline')
      .eq('id', candidateId)
      .single();

    if (candError || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidate profile not found' }), { status: 404, headers: cors });
    }

    const prompt = `
      You are an expert technical recruiter. Match the following candidate to the job description.
      
      JOB DESCRIPTION:
      Title: ${job.title}
      Location: ${job.location}
      Type: ${job.type}
      Required Skills: ${job.skills_required?.join(', ')}
      Experience Required: ${job.experience_min}-${job.experience_max} years
      Description: ${job.description}
      Requirements: ${job.requirements?.join('. ')}

      CANDIDATE PROFILE:
      Name: ${profile?.name}
      Headline: ${candidate.headline}
      Location: ${profile?.location}
      Skills: ${candidate.skills?.join(', ')}
      Experience: ${candidate.experience_years} years
      Education: ${candidate.education}
      Bio: ${profile?.about}

      Return a JSON object:
      {
        "score": number (0-100),
        "reasons": [string] (top 3 key matching or missing factors),
        "match_level": "low" | "medium" | "high" | "perfect"
      }
    `;

    const { data: aiResponse, error: aiError } = await insforgeAdmin.ai.chat.completions.create({
      model: 'anthropic/claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: prompt }],
      // @ts-ignore: response_format might not be in older SDK types but is supported by the backend
      response_format: { type: 'json_object' }
    });

    if (aiError) {
      return new Response(JSON.stringify({ error: aiError.message }), { status: 500, headers: cors });
    }

    const content = aiResponse.choices[0].message.content;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    console.error('AI Match Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
