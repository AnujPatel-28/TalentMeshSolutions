import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';
import { getCoreCounts, unwrap, getApplicationStatusCounts, getTopSkills } from '../_shared/metrics.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  try {
    if (request.method !== 'GET') {
      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    }

    const denied = checkPermission(role, { resource: 'reports', action: 'view' }, cors);
    if (denied) return denied;

    const [core, statusCounts, topSkills] = await Promise.all([
      getCoreCounts(db),
      getApplicationStatusCounts(db),
      getTopSkills(db),
    ]);

    const totalJobs = unwrap(core.totalJobs, 0);
    const totalApplications = unwrap(core.totalApplications, 0);
    const counts = unwrap(statusCounts, {
      applied: 0, reviewing: 0, shortlisted: 0, interviewing: 0, offered: 0, hired: 0, rejected: 0, withdrawn: 0,
    });

    const activeApps = totalApplications - counts.withdrawn;

    const funnel = {
      jobsPosted: totalJobs,
      applications: activeApps,
      reviewed: counts.reviewing + counts.shortlisted + counts.interviewing + counts.offered + counts.hired + counts.rejected,
      shortlisted: counts.shortlisted + counts.interviewing + counts.offered + counts.hired,
      hired: counts.hired,
    };

    const statusBreakdown = {
      applied: counts.applied + counts.reviewing + counts.offered,
      reviewing: counts.reviewing,
      shortlisted: counts.shortlisted,
      interview: counts.interviewing,
      interviewing: counts.interviewing,
      offer: counts.offered,
      offered: counts.offered,
      hired: counts.hired,
      rejected: counts.rejected,
    };

    return json({
      metrics: {
        totalJobs: totalJobs,
        totalApplications: activeApps,
        totalCandidates: unwrap(core.totalCandidates, 0),
        totalRecruiters: unwrap(core.totalRecruiters, 0),
        appsPerJob: totalJobs ? activeApps / totalJobs : 0,
      },
      funnel,
      statusBreakdown,
      topSkills: unwrap(topSkills, [])
    }, 200, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
