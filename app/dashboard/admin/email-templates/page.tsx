import Link from 'next/link';

// Stub: the email_templates table does not exist in the live database, so the previous
// implementation threw for every staff user. Left as a placeholder rather than creating the
// table — building the feature is a separate, specced piece of work (doc 23 F-23.4).
export default function EmailTemplatesPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
        Email Templates
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Template management is not available yet. Transactional emails currently use the
        built-in formats defined in the application code.
      </p>
      <Link href="/dashboard" style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
