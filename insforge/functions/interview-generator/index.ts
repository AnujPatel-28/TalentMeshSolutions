import { createClient } from 'npm:@insforge/sdk';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    // Use service role if needed, but here we just need to fetch job details
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token ?? null);

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Fetch Job Details
    const { data: job, error: jobErr } = await insforge.database
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      throw new Error('Job not found or inaccessible');
    }

    // 2. Generate contextual questions (Simulated AI Logic)
    // In a real production environment, this would call OpenAI/Gemini
    const questions = [
      `Can you describe your experience in ${job.industry || 'this sector'} and how you would apply it to the ${job.title} role?`,
      `How would you handle a complex technical challenge involving ${job.skills_required?.[0] || 'your core skills'}?`,
      `The job description emphasizes ${job.requirements?.[0] || 'certain requirements'}. How have you demonstrated this in previous roles?`,
      `In a ${job.type} environment, how do you manage priorities and ensure team alignment?`,
      `What specifically interests you about joining the ${job.department || 'team'} at this stage of the company's growth?`
    ];

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[interview-generator] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
