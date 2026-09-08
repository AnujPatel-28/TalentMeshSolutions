import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PortableText, type PortableTextComponents } from 'next-sanity';
import styles from '../blog.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { sanityClient } from '@/lib/sanity/client';
import { urlForImage } from '@/lib/sanity/image';
import { POST_BY_SLUG_QUERY, RELATED_POSTS_QUERY } from '@/lib/sanity/queries';

const SITE_URL = 'https://talentmeshsolutions.com';

// Shared between generateMetadata and the page body so the same request only
// hits Sanity once per render (React dedupes calls with identical arguments).
const getPost = cache(async (slug: string) => sanityClient.fetch(POST_BY_SLUG_QUERY, { slug }));

const IconArrowLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5m7-7-7 7 7 7" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
);

const ptComponents: PortableTextComponents = {
    block: {
        h2: ({ children }) => <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '2.5rem 0 1rem' }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2rem 0 1rem' }}>{children}</h3>,
        normal: ({ children }) => <p style={{ margin: '0 0 1.2rem', lineHeight: 1.9 }}>{children}</p>,
    },
    list: {
        bullet: ({ children }) => <ul style={{ listStyleType: 'disc', listStylePosition: 'outside', margin: '0 0 1.5rem 1.4rem', padding: 0, color: '#334155', lineHeight: 1.8 }}>{children}</ul>,
        number: ({ children }) => <ol style={{ listStyleType: 'decimal', listStylePosition: 'outside', margin: '0 0 1.5rem 1.4rem', padding: 0, color: '#334155', lineHeight: 1.8 }}>{children}</ol>,
    },
    listItem: {
        bullet: ({ children }) => <li style={{ marginBottom: '0.65rem' }}>{children}</li>,
        number: ({ children }) => <li style={{ marginBottom: '0.65rem' }}>{children}</li>,
    },
    types: {
        image: ({ value }) => {
            const url = urlForImage(value)?.width(900).url();
            if (!url) return null;
            return <img src={url} alt="" style={{ width: '100%', borderRadius: 12, margin: '1.5rem 0' }} />;
        },
    },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) return {};

    const coverImageUrl = post.coverImage ? urlForImage(post.coverImage)?.width(1200).height(630).url() : undefined;

    return {
        // Bare title: root layout's title.template appends " | TalentMesh Solutions".
        title: post.title,
        description: post.excerpt,
        alternates: { canonical: `/blog/${slug}` },
        openGraph: {
            title: post.title,
            description: post.excerpt,
            url: `${SITE_URL}/blog/${slug}`,
            siteName: 'TalentMesh Solutions',
            type: 'article',
            publishedTime: post.publishedAt,
            authors: post.authorName ? [post.authorName] : undefined,
            images: coverImageUrl ? [{ url: coverImageUrl }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt,
        },
    };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) notFound();

    const related = post.category
        ? await sanityClient.fetch(RELATED_POSTS_QUERY, { category: post.category, id: post.id })
        : [];

    const coverImageUrl = post.coverImage ? urlForImage(post.coverImage)?.width(1400).url() : undefined;

    return (
        <main className={styles.blogWrapper}>
            <div className="premium-container" style={{ paddingTop: '7rem', position: 'relative', zIndex: 1 }}>
                <Link href="/blog" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                    <IconArrowLeft /> Back to Blog
                </Link>
            </div>

            <article>
                <header className={`premium-container ${styles.detailHeader}`}>
                    <AnimateOnScroll animation="fadeUp">
                        <span className={styles.detailCategory}>
                            {post.category}
                        </span>
                        <h1 className={styles.detailTitle}>
                            {post.title}
                        </h1>
                        <div className={styles.detailAuthorWrapper}>
                            <div className={styles.detailAuthorAvatar}>
                                {(post.authorName || 'A').charAt(0)}
                            </div>
                            <div className={styles.detailAuthorInfo}>
                                <div className={styles.detailAuthorName}>{post.authorName || 'TalentMesh Editorial'}</div>
                                <div suppressHydrationWarning>{new Date(post.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {post.readTimeMinutes} min read</div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </header>

                <AnimateOnScroll animation="fadeUp" delay={100}>
                    <div className={`premium-container ${styles.detailImageWrapper}`}>
                        <div className={styles.detailImageContainer}>
                            <Image
                                src={coverImageUrl || "/images/tech-office.jpg"}
                                alt={post.title}
                                fill
                                style={{ objectFit: 'cover' }}
                                priority
                            />
                        </div>
                    </div>
                </AnimateOnScroll>

                <div className={styles.detailContentWrapper}>
                    <AnimateOnScroll animation="fadeUp" delay={200}>
                        <div className={styles.detailContent}>
                            {Array.isArray(post.body) && <PortableText value={post.body} components={ptComponents} />}
                        </div>
                    </AnimateOnScroll>
                </div>
            </article>

            {related.length > 0 && (
                <section className={styles.relatedSection}>
                    <div className="premium-container">
                        <div className={styles.relatedHeader}>
                            <h2 className={styles.relatedTitle}>Related Articles</h2>
                            <Link href="/blog" style={{ color: 'var(--primary-blue)', fontWeight: 700, textDecoration: 'none' }}>View All</Link>
                        </div>
                        <div className="premium-grid-3">
                            {related.map((rel: any) => {
                                const relImageUrl = rel.coverImage ? urlForImage(rel.coverImage)?.width(600).url() : undefined;
                                return (
                                    <Link href={`/blog/${rel.slug}`} key={rel.id} style={{ textDecoration: 'none' }}>
                                        <div className={`${styles.relatedCard} glass-card`}>
                                            <div className={styles.relatedImageWrapper}>
                                                <Image src={relImageUrl || "/images/tech-office.jpg"} alt={rel.title} fill style={{ objectFit: 'cover' }} />
                                            </div>
                                            <div className={styles.relatedContent}>
                                                <span className={styles.relatedCategory}>{rel.category}</span>
                                                <h3 className={styles.relatedCardTitle}>{rel.title}</h3>
                                                <div className={styles.relatedReadMore}>
                                                    Read More <IconArrowRight />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            <div className={`premium-container ${styles.detailCtaWrapper}`}>
                <div className={styles.detailCtaBox}>
                    <h2 className={styles.detailCtaTitle}>Enjoyed this article?</h2>
                    <p className={styles.detailCtaDesc}>Explore more insights on hiring, careers, and recruitment.</p>
                    <Link href="/blog" className={styles.detailCtaBtn}>
                        Read More Articles
                    </Link>
                </div>
            </div>
        </main>
    );
}
