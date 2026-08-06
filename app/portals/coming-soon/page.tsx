import Link from 'next/link';

export const metadata = {
  title: 'Recruiter Portal — Coming Soon | TalentMesh',
  description: 'The TalentMesh recruiter portal is launching soon. Stay tuned.',
};

export default function RecruiterComingSoonPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Logo / Brand mark */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 0 40px rgba(99,102,241,0.4)',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Badge */}
      <span
        style={{
          display: 'inline-block',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '100px',
          padding: '0.35rem 1rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#a5b4fc',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}
      >
        Coming Soon
      </span>

      <h1
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          color: '#f1f5f9',
          lineHeight: 1.1,
          marginBottom: '1.25rem',
          maxWidth: '640px',
        }}
      >
        The Recruiter Portal is{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          launching soon
        </span>
      </h1>

      <p
        style={{
          fontSize: '1.1rem',
          color: '#94a3b8',
          maxWidth: '500px',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
        }}
      >
        We are putting the finishing touches on a powerful hiring experience.
        If you were invited, please contact your TalentMesh administrator.
      </p>

      {/* CTA */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            transition: 'opacity 0.2s',
          }}
        >
          ← Back to TalentMesh
        </Link>
        <a
          href="mailto:info@talentmeshsolutions.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#cbd5e1',
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          Contact Us
        </a>
      </div>

      {/* Footer note */}
      <p
        style={{
          marginTop: '4rem',
          fontSize: '0.8rem',
          color: '#475569',
        }}
      >
        Already a recruiter?{' '}
        <a
          href="mailto:info@talentmeshsolutions.com"
          style={{ color: '#6366f1', textDecoration: 'none' }}
        >
          Get in touch
        </a>{' '}
        for early access.
      </p>
    </main>
  );
}
