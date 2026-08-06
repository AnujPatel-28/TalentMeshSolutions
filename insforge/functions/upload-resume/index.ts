export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    error: 'DEPRECATED_ENDPOINT', 
    message: 'This endpoint is deprecated. Use direct storage uploads and candidate_resumes table inserts.' 
  }), { 
    status: 410, 
    headers: corsHeaders 
  });
}
