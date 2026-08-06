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
    const resolvedServiceKey = serviceKey;
    const insforgeAdmin = createClient({ baseUrl, anonKey: resolvedServiceKey });

    // Validate requester role
    const { data: requesterProfile, error: requesterError } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (requesterError || !requesterProfile) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const isSystemAdmin = requesterProfile.role === 'admin' || requesterProfile.role === 'super_admin';
    const isRecruiter = requesterProfile.role === 'recruiter';

    if (!isSystemAdmin && !isRecruiter) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors });
    }

    // Parallel fetching: candidates are only fetched for system admins to preserve RLS on candidate launch
    const [jobsRes, appsRes, candidatesRes] = await Promise.all([
      insforgeAdmin.database.from('jobs').select('*, companies:companies(*)').eq('recruiter_id', userId).order('created_at', { ascending: false }),
      insforgeAdmin.database.from('applications').select('*, jobs!inner(*)').eq('jobs.recruiter_id', userId),
      isSystemAdmin
        ? insforgeAdmin.database.from('profiles').select('*, candidate_profiles(*)').eq('role', 'candidate').limit(30)
        : Promise.resolve({ data: [], error: null })
    ]);

    const jobs = jobsRes.data || [];
    const apps = appsRes.data || [];
    
    // Pipeline stats
    const pipeline = [
      { label: 'Applied', count: apps.filter(a => a.status === 'applied').length, color: '#3b82f6' },
      { label: 'Reviewing', count: apps.filter(a => a.status === 'reviewing').length, color: '#6366f1' },
      { label: 'Shortlisted', count: apps.filter(a => a.status === 'shortlisted').length, color: '#7c3aed' },
      { label: 'Interviewing', count: apps.filter(a => a.status === 'interviewing').length, color: '#f59e0b' },
      { label: 'Offered', count: apps.filter(a => a.status === 'offered').length, color: '#10b981' },
    ];

    const stats = {
      openJobs: jobs.filter(j => j.status === 'active').length,
      totalApplicants: apps.length,
      interviewsThisWeek: apps.filter(a => a.status === 'interviewing').length, // Simple proxy
      hires: apps.filter(a => a.status === 'hired').length
    };

    // Calculate dynamic candidate match & category based on recruiter's active job requirements
    const activeJobs = jobs.filter(j => j.status === 'active');
    const recruiterSkills = Array.from(new Set(activeJobs.flatMap(j => j.skills_required || [])));
    
    const skillToDeptMap: Record<string, string> = {};
    activeJobs.forEach(j => {
      const dept = j.department || 'Tech';
      (j.skills_required || []).forEach((s: string) => {
        skillToDeptMap[s.toLowerCase()] = dept;
      });
    });

    const candidateList = (candidatesRes.data || []).map(c => {
      const skills = c.candidate_profiles?.skills || [];
      const headline = (c.candidate_profiles?.headline || '').toLowerCase();
      
      const matches = skills.filter((s: string) => recruiterSkills.some(rs => rs.toLowerCase() === s.toLowerCase()));
      
      let matchScore = 70 + Math.floor(Math.random() * 15); // Baseline
      if (recruiterSkills.length > 0 && matches.length > 0) {
        matchScore = Math.min(100, Math.round(80 + (matches.length / Math.min(recruiterSkills.length, 5)) * 20));
      }
      
      let category = 'Tech'; // Default
      const matchWithDept = matches.find((s: string) => skillToDeptMap[s.toLowerCase()]);
      if (matchWithDept) {
        category = skillToDeptMap[matchWithDept.toLowerCase()];
      } else {
        const headlineAndSkills = (headline + ' ' + skills.join(' ')).toLowerCase();
        if (headlineAndSkills.includes('finance') || headlineAndSkills.includes('analyst') || headlineAndSkills.includes('accountant') || headlineAndSkills.includes('modeling')) {
          category = 'Finance';
        } else if (headlineAndSkills.includes('design') || headlineAndSkills.includes('ui') || headlineAndSkills.includes('ux') || headlineAndSkills.includes('creative')) {
          category = 'Design';
        } else if (headlineAndSkills.includes('marketing') || headlineAndSkills.includes('sales') || headlineAndSkills.includes('growth')) {
          category = 'Marketing';
        }
      }

      return {
        id: c.id,
        name: c.name,
        role: c.candidate_profiles?.headline || 'Candidate Profile',
        skills: skills,
        match: matchScore,
        category: category
      };
    });

    // Sort by match score descending
    candidateList.sort((a, b) => b.match - a.match);

    const dashboardData = {
      stats,
      pipeline,
      recentJobs: jobs.slice(0, 5).map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        applicants: j.applications_count || 0,
        new_applicants: 0 // Would need timestamp comparison
      })),
      topCandidates: candidateList.slice(0, 5),
      recommendations_disabled: !isSystemAdmin
    };

    return new Response(JSON.stringify(dashboardData), { 
      status: 200, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Recruiter Dashboard Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
