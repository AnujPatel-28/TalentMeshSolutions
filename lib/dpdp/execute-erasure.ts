// Executes the plan in lib/dpdp/erasure.ts against the live DB. Called only from
// app/api/admin/dpdp/decide/route.ts when a staff member marks an `erasure` request `completed` —
// never automatically, and never from a client-writable path. Service-role only, same reasoning
// as lib/insforge-admin.ts.
import { insforgeAdmin } from '@/lib/insforge-admin';
import {
  APPLICATIONS_CANDIDATE_OWNED_COLUMNS,
  CANDIDATE_PROFILE_COLUMNS_CLEARED,
  RECRUITER_PROFILE_COLUMNS_CLEARED,
  PROFILE_COLUMNS_CLEARED,
} from './erasure';

function nullMap(columns: readonly string[]): Record<string, null> {
  return Object.fromEntries(columns.map((c) => [c, null]));
}

// `file_url`/`avatar_url` columns store a full storage URL, not a bucket-relative key — the SDK's
// storage.remove() needs the key. Same '/objects/' marker extraction already used inline in
// app/dashboard/recruiter/[role_id]/settings/page.tsx (~line 161) for avatar/logo replacement;
// duplicated here rather than extracted into a shared util for a two-caller, ten-line function.
function storagePathFromUrl(url: string): string {
  const marker = '/objects/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return url; // already a bucket-relative key
  let path = url.substring(markerIndex + marker.length);
  const qIndex = path.indexOf('?');
  if (qIndex !== -1) path = path.substring(0, qIndex);
  return decodeURIComponent(path);
}

// Order matters — see lib/dpdp/erasure.ts: resumes are deleted first so their own
// ON DELETE SET NULL FKs clear candidate_profiles.primary_resume_id / applications.resume_id as
// a side effect, before the applications step clears the remaining text columns explicitly.
export async function executeErasure(userId: string, role: 'candidate' | 'recruiter'): Promise<void> {
  if (!insforgeAdmin) {
    throw new Error('Service key not configured');
  }
  const db = insforgeAdmin.database;

  if (role === 'candidate') {
    const { data: resumes } = await db.from('candidate_resumes').select('id, file_url').eq('candidate_id', userId);
    for (const resume of resumes ?? []) {
      if (resume.file_url) {
        await insforgeAdmin.storage.from('resumes').remove(storagePathFromUrl(resume.file_url)).catch(() => {});
      }
    }
    await db.from('candidate_resumes').delete().eq('candidate_id', userId);

    const { error: appsError } = await db
      .from('applications')
      .update(nullMap(APPLICATIONS_CANDIDATE_OWNED_COLUMNS))
      .eq('candidate_id', userId);
    if (appsError) throw new Error(`applications anonymise failed: ${appsError.message}`);

    const { error: candProfileError } = await db
      .from('candidate_profiles')
      .update({ ...nullMap(CANDIDATE_PROFILE_COLUMNS_CLEARED), is_visible: false, is_discoverable: false })
      .eq('id', userId);
    if (candProfileError) throw new Error(`candidate_profiles anonymise failed: ${candProfileError.message}`);
  } else {
    const { error: recProfileError } = await db
      .from('recruiter_profiles')
      .update(nullMap(RECRUITER_PROFILE_COLUMNS_CLEARED))
      .eq('id', userId);
    if (recProfileError) throw new Error(`recruiter_profiles anonymise failed: ${recProfileError.message}`);
  }

  const { data: profileRow } = await db.from('profiles').select('avatar_url').eq('id', userId).single();
  if (profileRow?.avatar_url) {
    await insforgeAdmin.storage.from('avatars').remove(storagePathFromUrl(profileRow.avatar_url)).catch(() => {});
  }

  const { error: profileError } = await db
    .from('profiles')
    .update({ ...nullMap(PROFILE_COLUMNS_CLEARED), is_active: false })
    .eq('id', userId);
  if (profileError) throw new Error(`profiles anonymise failed: ${profileError.message}`);

  // is_active = false alone does not end a live session — user_sessions.user_id is
  // ON DELETE CASCADE and the codebase already has a session-invalidation mechanism
  // (handle_password_change_invalidation trigger), so an erased account must not keep working
  // under an already-issued JWT until it expires on its own.
  await db.from('user_sessions').delete().eq('user_id', userId);

  // consent_records is deliberately untouched — see lib/dpdp/erasure.ts.
}
