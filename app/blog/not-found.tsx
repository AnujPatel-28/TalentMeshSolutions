import Link from 'next/link';

export default function BlogNotFound() {
    return (
        <main style={{ padding: '120px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0D47A1', marginBottom: 12 }}>Post Not Found</h1>
            <p style={{ color: '#475569', marginBottom: 24 }}>The article you&apos;re looking for doesn&apos;t exist or has been unpublished.</p>
            <Link href="/blog" style={{ color: '#007BFF', fontWeight: 600, textDecoration: 'underline' }}>← Back to Blog</Link>
        </main>
    );
}
