import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';
import {
  getCoreCounts, unwrap, toCountMetric, getApplicationStatusCounts, getTopSkills,
  getPendingVerifications, getCompaniesByStatus, getActiveJobSlots,
} from '../_shared/metrics.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  try {
    let action = 'get-summary';
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.action) action = body.action;
      } catch (e) {
        // body parsing failed, stick with default
      }
    } else {
      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    }

    const denied = checkPermission(role, { resource: 'dashboard', action: 'view' }, cors);
    if (denied) return denied;

    const core = await getCoreCounts(db);
    const totalJobs = unwrap(core.totalJobs, 0);
    const totalApps = unwrap(core.totalApplications, 0);

    if (action === 'get-reports') {
      const [statusCounts, topSkills] = await Promise.all([
        getApplicationStatusCounts(db),
        getTopSkills(db),
      ]);

      const withdrawn = 'value' in statusCounts ? statusCounts.value.withdrawn : 0;
      const reviewing = 'value' in statusCounts ? statusCounts.value.reviewing : 0;
      const shortlisted = 'value' in statusCounts ? statusCounts.value.shortlisted : 0;
      const interviewing = 'value' in statusCounts ? statusCounts.value.interviewing : 0;
      const offered = 'value' in statusCounts ? statusCounts.value.offered : 0;
      const hired = 'value' in statusCounts ? statusCounts.value.hired : 0;
      const rejected = 'value' in statusCounts ? statusCounts.value.rejected : 0;
      const applied = 'value' in statusCounts ? statusCounts.value.applied : 0;

      const { data: candidatesData } = await db.database
        .from('candidate_profiles')
        .select('skills, created_at');

      const rawCandidates = candidatesData || [];

      const nowMs = Date.now();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const createdTimes = rawCandidates.map((c: any) => c.created_at ? new Date(c.created_at).getTime() : nowMs);
      const cumulativeAsOf = (boundary: number) => createdTimes.filter((t: number) => t <= boundary).length;

      const growth = [
        { date: '3 wks ago', count: cumulativeAsOf(nowMs - 3 * oneWeekMs) },
        { date: '2 wks ago', count: cumulativeAsOf(nowMs - 2 * oneWeekMs) },
        { date: '1 wk ago',  count: cumulativeAsOf(nowMs - oneWeekMs) },
        { date: 'Now',       count: cumulativeAsOf(nowMs) }
      ];

      return json({
        metrics: {
          totalJobs: totalJobs,
          totalApplications: totalApps - withdrawn,
          totalCandidates: unwrap(core.totalCandidates, 0),
          totalRecruiters: unwrap(core.totalRecruiters, 0),
          appsPerJob: totalJobs > 0 ? ((totalApps - withdrawn) / totalJobs) : 0
        },
        funnel: {
          jobsPosted: totalJobs,
          applications: totalApps - withdrawn,
          reviewed: reviewing + shortlisted + interviewing + offered + hired + rejected,
          shortlisted: shortlisted + interviewing + offered + hired,
          hired: hired
        },
        growth,
        topSkills: unwrap(topSkills, []),
        statusBreakdown: {
          applied: applied,
          shortlisted: shortlisted,
          interview: interviewing,
          rejected: rejected
        }
      }, 200, cors);
    }

    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      activeJobs, pendingRecruiters, pendingJobs, reportedJobs, newUsers24h,
      activitiesRes, pendingVerifications, companiesByStatus, activeJobSlots,
    ] = await Promise.all([
      toCountMetric(db.database.from('jobs').select('*', { count: 'exact', head: true }).eq('is_approved', true).eq('status', 'active')),
      toCountMetric(db.database.from('recruiter_profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false)),
      toCountMetric(db.database.from('jobs').select('*', { count: 'exact', head: true }).eq('is_approved', false)),
      toCountMetric(db.database.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'reported')),
      toCountMetric(db.database.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', past24h)),
      db.database.from('activity').select('id, type, description, created_at, profiles(name)').order('created_at', { ascending: false }).limit(10),
      getPendingVerifications(db),
      getCompaniesByStatus(db),
      getActiveJobSlots(db),
    ]);

    const activitiesList = (activitiesRes.data || []).map((act: any) => ({
      id: act.id,
      actor: act.profiles?.name || 'System',
      type: act.type,
      description: act.description,
      created_at: act.created_at
    }));

    return json({
      metrics: {
        totalJobs: unwrap(core.totalJobs, 0),
        activeJobs: unwrap(activeJobs, 0),
        totalApplications: unwrap(core.totalApplications, 0),
        totalCandidates: unwrap(core.totalCandidates, 0),
        totalRecruiters: unwrap(core.totalRecruiters, 0)
      },
      companyKpis: {
        companiesByStatus,
        activeJobSlots
      },
      activities: activitiesList,
      alerts: {
        pendingRecruiters: unwrap(pendingRecruiters, 0),
        pendingJobs: unwrap(pendingJobs, 0),
        reportedJobs: unwrap(reportedJobs, 0),
        newUsers24h: unwrap(newUsers24h, 0),
        pendingVerifications: unwrap(pendingVerifications, 0)
      }
    }, 200, cors);

  } catch (error) {
    return internalError(cors, error);
  }
}
