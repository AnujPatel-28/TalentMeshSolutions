import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { COUNTRY_NAMES } from '../_shared/country-names.ts';

// `country_name` is deliberately excluded — the client never sends it, the server always
// derives it from `country_code` (see the PUT handler) so it can't be spoofed out of sync.
const PROFILE_ALLOWED_KEYS = new Set(['name', 'phone', 'location', 'bio', 'avatar_url', 'city', 'state', 'country_code', 'postal_code']);

const CP_ALLOWED_KEYS = new Set([
  'headline', 'skills', 'experience_years', 'education', 'work_history',
  'resume_url', 'linkedin_url', 'github_url', 'portfolio_url',
  'salary_min', 'salary_max', 'preferred_locations', 'is_visible',
  'job_types', 'open_to_remote', 'currency', 'profile_strength',
  'is_discoverable', 'primary_resume_id',
  'employment_status', 'notice_period', 'willing_to_relocate', 'work_authorization', 'current_ctc',
]);

const NOTICE_PERIOD_VALUES = new Set(['immediate', '15_days', '30_days', '60_days', '90_days', 'other']);
const WORK_AUTHORIZATION_VALUES = new Set(['citizen', 'permanent_resident', 'work_visa', 'requires_sponsorship', 'other']);
const EMPLOYMENT_STATUS_VALUES = new Set(['student_fresher', 'employed', 'unemployed', 'freelancer', 'career_break']);

function isOptionalEnum(v: unknown, allowed: Set<string>): boolean {
  return v === null || v === undefined || (typeof v === 'string' && allowed.has(v));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isOptionalString(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'string';
}

function isOptionalNumber(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'number' && isFinite(v));
}

function isOptionalBool(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'boolean';
}

function isOptionalStringArray(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (!Array.isArray(v)) return false;
  return v.every((item) => typeof item === 'string');
}

function isOptionalUrl(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v !== 'string') return false;
  try { new URL(v); return true; } catch { return false; }
}

function isOptionalStoragePath(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v !== 'string') return false;
  if (v.length > 500) return false;
  if (/^https?:\/\//i.test(v)) {
    try { new URL(v); return true; } catch { return false; }
  }
  if (v.includes('..') || v.startsWith('/') || v.startsWith('\\')) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(v);
}

function isEducationValid(v: unknown): boolean {
  if (v === null || v === undefined || typeof v === 'string') return true;
  if (!Array.isArray(v)) return false;
  return v.every((e) => {
    if (!isPlainObject(e)) return false;
    if (typeof e.degree !== 'string' || e.degree.trim() === '') return false;
    if (typeof e.id !== 'string') return false;
    return true;
  });
}

function isWorkHistoryValid(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (!Array.isArray(v)) return false;
  return v.every((e) => {
    if (!isPlainObject(e)) return false;
    if (typeof e.title !== 'string' || e.title.trim() === '') return false;
    if (typeof e.company !== 'string' || e.company.trim() === '') return false;
    if (typeof e.id !== 'string') return false;
    return true;
  });
}

type ValidationError = { field: string; message: string };

function validateProfileBody(body: unknown): { errors: ValidationError[]; profile: Record<string, unknown> | null; candidateProfile: Record<string, unknown> | null } {
  const errors: ValidationError[] = [];

  if (!isPlainObject(body)) {
    return { errors: [{ field: 'body', message: 'Body must be an object' }], profile: null, candidateProfile: null };
  }

  let profile: Record<string, unknown> | null = null;
  let candidateProfile: Record<string, unknown> | null = null;

  if (body.profile !== undefined && body.profile !== null) {
    if (!isPlainObject(body.profile)) {
      errors.push({ field: 'profile', message: 'profile must be an object' });
    } else {
      const p = body.profile;
      if (!isOptionalString(p.name)) errors.push({ field: 'profile.name', message: 'name must be a string' });
      if (!isOptionalString(p.phone)) errors.push({ field: 'profile.phone', message: 'phone must be a string' });
      if (!isOptionalString(p.location)) errors.push({ field: 'profile.location', message: 'location must be a string' });
      if (!isOptionalString(p.bio)) errors.push({ field: 'profile.bio', message: 'bio must be a string' });
      if (!isOptionalStoragePath(p.avatar_url)) errors.push({ field: 'profile.avatar_url', message: 'avatar_url must be a valid storage path or URL' });
      if (!isOptionalString(p.city)) errors.push({ field: 'profile.city', message: 'city must be a string' });
      if (!isOptionalString(p.state)) errors.push({ field: 'profile.state', message: 'state must be a string' });
      if (!isOptionalString(p.postal_code)) errors.push({ field: 'profile.postal_code', message: 'postal_code must be a string' });
      if (!isOptionalEnum(p.country_code, new Set(Object.keys(COUNTRY_NAMES)))) errors.push({ field: 'profile.country_code', message: 'country_code must be a known ISO 3166-1 alpha-2 code' });

      profile = {};
      for (const key of PROFILE_ALLOWED_KEYS) {
        if (key in p) profile[key] = p[key];
      }
    }
  }

  if (body.candidateProfile !== undefined && body.candidateProfile !== null) {
    if (!isPlainObject(body.candidateProfile)) {
      errors.push({ field: 'candidateProfile', message: 'candidateProfile must be an object' });
    } else {
      const cp = body.candidateProfile;
      if (!isOptionalString(cp.headline)) errors.push({ field: 'candidateProfile.headline', message: 'headline must be a string' });
      if (!isOptionalString(cp.currency)) errors.push({ field: 'candidateProfile.currency', message: 'currency must be a string' });
      if (!isOptionalNumber(cp.experience_years)) errors.push({ field: 'candidateProfile.experience_years', message: 'experience_years must be a number' });
      if (!isOptionalNumber(cp.salary_min)) errors.push({ field: 'candidateProfile.salary_min', message: 'salary_min must be a number' });
      if (!isOptionalNumber(cp.salary_max)) errors.push({ field: 'candidateProfile.salary_max', message: 'salary_max must be a number' });
      if (!isOptionalBool(cp.is_visible)) errors.push({ field: 'candidateProfile.is_visible', message: 'is_visible must be a boolean' });
      if (!isOptionalBool(cp.is_discoverable)) errors.push({ field: 'candidateProfile.is_discoverable', message: 'is_discoverable must be a boolean' });
      if (!isOptionalString(cp.primary_resume_id)) errors.push({ field: 'candidateProfile.primary_resume_id', message: 'primary_resume_id must be a string' });
      if (!isOptionalBool(cp.open_to_remote)) errors.push({ field: 'candidateProfile.open_to_remote', message: 'open_to_remote must be a boolean' });
      if (!isOptionalStringArray(cp.skills)) errors.push({ field: 'candidateProfile.skills', message: 'skills must be an array of strings' });
      if (!isOptionalStringArray(cp.preferred_locations)) errors.push({ field: 'candidateProfile.preferred_locations', message: 'preferred_locations must be an array of strings' });
      if (!isOptionalStringArray(cp.job_types)) errors.push({ field: 'candidateProfile.job_types', message: 'job_types must be an array of strings' });
      if (!isOptionalStoragePath(cp.resume_url)) errors.push({ field: 'candidateProfile.resume_url', message: 'resume_url must be a valid storage path or URL' });
      if (!isOptionalUrl(cp.linkedin_url)) errors.push({ field: 'candidateProfile.linkedin_url', message: 'linkedin_url must be a URL' });
      if (!isOptionalUrl(cp.github_url)) errors.push({ field: 'candidateProfile.github_url', message: 'github_url must be a URL' });
      if (!isOptionalUrl(cp.portfolio_url)) errors.push({ field: 'candidateProfile.portfolio_url', message: 'portfolio_url must be a URL' });
      if (!isEducationValid(cp.education)) errors.push({ field: 'candidateProfile.education', message: 'education must be a string or array of education entries' });
      if (!isWorkHistoryValid(cp.work_history)) errors.push({ field: 'candidateProfile.work_history', message: 'work_history must be an array of work experience entries' });
      if (!isOptionalEnum(cp.employment_status, EMPLOYMENT_STATUS_VALUES)) errors.push({ field: 'candidateProfile.employment_status', message: 'employment_status must be one of student_fresher, employed, unemployed, freelancer, career_break' });
      if (!isOptionalEnum(cp.notice_period, NOTICE_PERIOD_VALUES)) errors.push({ field: 'candidateProfile.notice_period', message: 'notice_period must be one of immediate, 15_days, 30_days, 60_days, 90_days, other' });
      if (!isOptionalEnum(cp.work_authorization, WORK_AUTHORIZATION_VALUES)) errors.push({ field: 'candidateProfile.work_authorization', message: 'work_authorization must be one of citizen, permanent_resident, work_visa, requires_sponsorship, other' });
      if (!isOptionalBool(cp.willing_to_relocate)) errors.push({ field: 'candidateProfile.willing_to_relocate', message: 'willing_to_relocate must be a boolean' });
      if (!isOptionalNumber(cp.current_ctc)) errors.push({ field: 'candidateProfile.current_ctc', message: 'current_ctc must be a number' });

      candidateProfile = {};
      for (const key of CP_ALLOWED_KEYS) {
        if (key in cp) candidateProfile[key] = cp[key];
      }
    }
  }

  return { errors, profile, candidateProfile };
}

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return errorJson('unauthorized', 'Unauthorized', 401, cors);
  }

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const resolvedServiceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('API_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || '';

  try {
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const insforgeAdmin = createClient({ baseUrl, anonKey: resolvedServiceKey || anonKey, isServerMode: true });

    const { data: { user }, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !user) {
      return errorJson('unauthorized', 'Unauthorized', 401, cors);
    }

    if (req.method === 'GET') {
      const { data: profile, error: profileError } = await insforgeAdmin.database
        .from('profiles').select('*').eq('id', user.id).single();
      
      const { data: candidateProfile, error: cpError } = await insforgeAdmin.database
        .from('candidate_profiles').select('*').eq('id', user.id).single();

      return json({
        profile,
        candidateProfile,
        debug: {
          hasServiceKey: !!resolvedServiceKey,
          profileError: profileError ? profileError.message : null,
          cpError: cpError ? cpError.message : null
        }
      }, 200, cors);
    }

    if (req.method === 'PUT') {
      const idempotencyKey = req.headers.get('x-idempotency-key');
      const idem = await beginIdempotency(insforgeAdmin, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return errorJson('invalid_request', 'Invalid JSON body', 400, cors);
        }

        const { errors, profile: profileUpdates, candidateProfile: candidateUpdates } = validateProfileBody(body);

        if (errors.length > 0) {
          const formattedErrors: Record<string, string[]> = {};
          for (const err of errors) {
            if (!formattedErrors[err.field]) formattedErrors[err.field] = [];
            formattedErrors[err.field].push(err.message);
          }
          return errorJson('invalid_request', 'Validation failed', 400, cors, formattedErrors);
        }

        if (profileUpdates && Object.keys(profileUpdates).length > 0) {
          // Derive country_name + location server-side so they can't drift from
          // country_code, and so existing consumers of `location` (candidates search
          // substring filter, admin candidates list) keep working unchanged.
          if ('country_code' in profileUpdates) {
            const code = profileUpdates.country_code as string | null;
            profileUpdates.country_name = code ? (COUNTRY_NAMES[code] || code) : null;
          }
          if ('city' in profileUpdates) {
            const city = profileUpdates.city as string | null;
            const countryCode = (profileUpdates.country_code as string | undefined) ?? undefined;
            const state = (profileUpdates.state as string | undefined) ?? undefined;
            const countryName = (profileUpdates.country_name as string | undefined) ?? undefined;
            if (city) {
              const secondary = countryCode === 'IN' || countryCode === undefined ? state : countryName;
              profileUpdates.location = secondary ? `${city}, ${secondary}` : city;
            }
          }

          const { error } = await insforgeAdmin.database.from('profiles').update({
            ...profileUpdates,
            completed_onboarding: true,
          }).eq('id', user.id);
          if (error) throw error;
        }

        if (candidateUpdates && Object.keys(candidateUpdates).length > 0) {
          const { error } = await insforgeAdmin.database.from('candidate_profiles').upsert({
            id: user.id,
            ...candidateUpdates,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
        }

        const { data: updatedProfile } = await insforgeAdmin.database.from('profiles').select('*').eq('id', user.id).single();
        const { data: updatedCandidateProfile } = await insforgeAdmin.database.from('candidate_profiles').select('*').eq('id', user.id).single();

        const resPayload = { profile: updatedProfile, candidateProfile: updatedCandidateProfile };
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
