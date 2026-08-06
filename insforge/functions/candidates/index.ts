import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return errorJson('unauthorized', 'Unauthorized', 401, cors);
  }

  const baseUrl = getBaseUrl();
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = getServiceKey();

  try {
    const verifyClient = createClient({
      baseUrl,
      anonKey,
      edgeFunctionToken: token,
      isServerMode: true
    });

    const { data: authData, error: authError } = await verifyClient.auth.getCurrentUser();
    if (authError || !authData?.user) {
      return errorJson('unauthorized', 'Unauthorized, invalid token', 401, cors);
    }

    const userData = { id: authData.user.id };

    const { data: profile, error: profileError } = await verifyClient.database
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.id)
      .single();

    if (profileError || !profile) {
      return errorJson('unauthorized', 'Unauthorized, profile not found', 401, cors);
    }

    if (profile.is_active !== true) {
      return errorJson('forbidden', 'Forbidden, account is suspended', 403, cors);
    }

    if (profile.role !== 'recruiter') {
      return json({ data: [], total: 0, hasMore: false }, 200, cors);
    }

    const url = new URL(req.url);
    const searchRaw = url.searchParams.get('search') || '';
    const search = escapeOrFilter(searchRaw).toLowerCase();
    
    const skillsRaw = url.searchParams.get('skills') || '';
    const skills = skillsRaw.split(',').map(s => escapeOrFilter(s).toLowerCase()).filter(Boolean);
    
    const locationRaw = url.searchParams.get('location') || '';
    const location = escapeOrFilter(locationRaw).toLowerCase();
    
    const page = parseInt(url.searchParams.get('page') || '0');
    const limit = capLimit(url.searchParams.get('limit'), 100, 20);

    let recruiterDomain = '';
    try {
      const email = authData.user.email || '';
      const domain = email.split('@')[1]?.toLowerCase();
      const freeProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'aol.com', 'icloud.com'];
      if (domain && !freeProviders.includes(domain)) {
        recruiterDomain = domain;
      }
    } catch (e) {
      console.warn('Failed to extract recruiter domain:', e);
    }

    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });

    let query = insforgeAdmin.database
      .from('profiles')
      .select('*, candidate_profiles!inner(*)')
      .eq('role', 'candidate')
      // Doc 26 §4 L-3: a candidate who withdraws profile_visible_to_recruiters must stop
      // appearing in recruiter search. Was previously unenforced here — see admin-candidates,
      // the only other place in the codebase that filters on this column.
      .eq('candidate_profiles.is_discoverable', true);

    const { data: allCandidates, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    let filtered = allCandidates || [];

    if (location) {
      filtered = filtered.filter(c => {
        const loc = (c.location || '').toLowerCase();
        return loc.includes(location);
      });
    }

    if (skills.length > 0) {
      filtered = filtered.filter(c => {
        const candSkills = (c.candidate_profiles?.skills || []).map((s: string) => s.toLowerCase());
        return skills.every(skill => candSkills.some((s: string) => s.includes(skill)));
      });
    }

    if (search) {
      filtered = filtered.filter(c => {
        const name = (c.name || '').toLowerCase();
        const loc = (c.location || '').toLowerCase();
        const headline = (c.candidate_profiles?.headline || '').toLowerCase();
        const summary = (c.bio || c.candidate_profiles?.summary || '').toLowerCase();
        const candSkills = (c.candidate_profiles?.skills || []).map((s: string) => s.toLowerCase());

        let workHistoryStr = '';
        if (Array.isArray(c.candidate_profiles?.work_history)) {
          workHistoryStr = (c.candidate_profiles.work_history as any[]).map((exp: any) => {
            if (typeof exp === 'string') return exp;
            return `${exp.company || ''} ${exp.role || ''} ${exp.description || ''}`;
          }).join(' ');
        } else if (typeof c.candidate_profiles?.work_history === 'string') {
          workHistoryStr = c.candidate_profiles.work_history;
        }

        let educationStr = '';
        if (Array.isArray(c.candidate_profiles?.education)) {
          educationStr = (c.candidate_profiles.education as any[]).map((edu: any) => {
            if (typeof edu === 'string') return edu;
            return `${edu.institution || ''} ${edu.degree || ''} ${edu.field || ''}`;
          }).join(' ');
        } else if (typeof c.candidate_profiles?.education === 'string') {
          educationStr = c.candidate_profiles.education;
        }

        const matchName = name.includes(search);
        const matchLoc = loc.includes(search);
        const matchHeadline = headline.includes(search);
        const matchSummary = summary.includes(search);
        const matchSkills = candSkills.some((s: string) => s.includes(search));
        const matchWorkHistory = workHistoryStr.toLowerCase().includes(search);
        const matchEducation = educationStr.toLowerCase().includes(search);

        return matchName || matchLoc || matchHeadline || matchSummary || matchSkills || matchWorkHistory || matchEducation;
      });
    }

    if (recruiterDomain) {
      filtered.sort((a, b) => {
        const domainA = (a.email || '').split('@')[1]?.toLowerCase() || '';
        const domainB = (b.email || '').split('@')[1]?.toLowerCase() || '';
        const isMatchA = domainA === recruiterDomain ? 1 : 0;
        const isMatchB = domainB === recruiterDomain ? 1 : 0;
        return isMatchB - isMatchA;
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(page * limit, (page + 1) * limit);

    return json({ 
      data: paginated.map(c => ({
        id: c.id,
        name: c.name,
        role: c.candidate_profiles?.headline || 'Candidate',
        location: c.location,
        skills: c.candidate_profiles?.skills || [],
        match: c.ai_match_score || (85 + Math.floor(Math.random() * 15)),
        avatar_url: c.avatar_url,
        experience_years: c.candidate_profiles?.experience_years || 0,
        summary: c.bio || c.candidate_profiles?.summary || '',
        work_history: c.candidate_profiles?.work_history || [],
        education: c.candidate_profiles?.education || []
      })),
      total: total,
      hasMore: (page + 1) * limit < total
    }, 200, cors);

  } catch (err) {
    return internalError(cors, err);
  }
}
