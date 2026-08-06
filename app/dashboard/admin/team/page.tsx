import Link from 'next/link';

// Stub: the admin_members table does not exist in the live database, so the previous
// implementation threw for every staff user. Staff roles live in profiles.role (the single
// authorization source, doc 14 §4.3) and are managed directly there — a team-management UI
// is separate, specced work (doc 23 F-23.4).
export default function AdminTeamPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
        Admin Team
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Team management is not available yet. Staff access is controlled by the role on each
        user&apos;s profile.
      </p>
      <Link href="/dashboard" style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
