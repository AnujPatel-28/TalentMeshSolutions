/**
 * TalentMesh Dashboard API Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * All functions invoke InsForge Edge Functions.
 */

import type {
    CompanyDashboardData, CandidateDashboardData,
} from '@/types/dashboard';

import { insforge } from '@/lib/insforge';

// ─── Company Dashboard ─────────────────────────────────────────────────────

export async function fetchCompanyDashboard(companyId: string): Promise<CompanyDashboardData> {
    const { data, error } = await insforge.functions.invoke('dashboard', {
        body: { type: 'company', companyId }
    });

    if (error) {
        throw new Error(`Failed to fetch company dashboard: ${error.message}`);
    }

    return {
        pipeline: {
            stages: data.pipelineStages,
            candidates: data.candidates,
        },
        topCandidates: data.candidates.slice(0, 5),
        jobs: data.jobs,
        interviews: data.interviews,
        diversity: data.diversity,
        activity: data.activity,
        kpis: data.kpis,
    };
}

// ─── Candidate Dashboard ────────────────────────────────────────────────────

export async function fetchCandidateDashboard(candidateId: string): Promise<CandidateDashboardData> {
    const { data, error } = await insforge.functions.invoke('dashboard', {
        body: { type: 'candidate', candidateId }
    });

    if (error) {
        throw new Error(`Failed to fetch candidate dashboard: ${error.message}`);
    }

    return {
        profile: {
            ...data.profile,
            name: data.profile?.name || 'User',
            role: data.profile?.role || 'Job Seeker',
            avatar: data.profile?.avatar || 'U',
            profileStrength: data.profile?.profile_strength || 0,
            views7d: data.profile?.views_7d || 0,
            aiKarma: data.profile?.ai_karma || 0,
            completionItems: [
                { label: 'Add work samples / portfolio', done: false },
                { label: 'Complete skill assessments', done: false },
                { label: 'Add your LinkedIn URL', done: true },
                { label: 'Upload resume (PDF)', done: true },
                { label: 'Verify email address', done: true },
            ],
        },
        applications: data.applications || [],
        recommendations: [], // Placeholder for now
        skillGaps: [
            { skill: 'System Design', current: 70, required: 90, category: 'Architecture', priority: 'critical', resources: 'Grokking System Design' },
            { skill: 'TypeScript', current: 85, required: 95, category: 'Languages', priority: 'high', resources: 'TypeScript Deep Dive' },
            { skill: 'AWS / Cloud', current: 45, required: 80, category: 'DevOps', priority: 'high', resources: 'AWS Developer Path' },
        ],
        interviews: data.interviews || [],
        activity: data.activity || [],
        kpis: data.kpis,
    };
}

// ─── Action Functions ─────────────────────────────────────────────────────────

export async function confirmInterview(interviewId: string): Promise<{ success: boolean }> {
    const { error } = await insforge.database
        .from('interviews')
        .update({ status: 'confirmed' })
        .eq('id', interviewId);

    return { success: !error };
}

export async function saveJob(jobId: string, saved: boolean): Promise<{ success: boolean }> {
    console.log(`[API] ${saved ? 'Saving' : 'Unsaving'} job ${jobId}`);
    return { success: true };
}

export async function updateApplicationStage(appId: string, stage: string): Promise<{ success: boolean }> {
    const { error } = await insforge.database
        .from('applications')
        .update({ stage, last_update: new Date().toISOString() })
        .eq('id', appId);

    return { success: !error };
}
