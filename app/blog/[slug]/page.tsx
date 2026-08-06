"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../blog.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { SafeBlogContent } from '@/components/blog/SafeBlogContent';
import { publicInsforge } from '@/lib/insforge';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import { LoadingScreen } from '@/components/ui';

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

export default function BlogDetailPage() {
    const { slug } = useParams();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPost() {
            try {
                const slugStr = Array.isArray(slug) ? slug[0] : slug;

                // Fetch article by slug
                const { data: postData, error: postError } = await publicInsforge.database
                    .from('blog')
                    .select('id, title, slug, excerpt, content, category, cover_image, status, created_at, author_id, author:profiles(name)')
                    .eq('slug', slugStr)
                    .eq('status', 'published')
                    .single();

                if (postError || !postData) {
                    throw new Error('Not found');
                }

                setPost(postData);

                // Fetch related posts in same category, excluding current article
                const { data: relatedData } = await publicInsforge.database
                    .from('blog')
                    .select('id, title, slug, category, cover_image, created_at')
                    .eq('status', 'published')
                    .eq('category', postData.category)
                    .neq('id', postData.id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                setRelated(relatedData || []);
            } catch (err) {
                console.error(err);
                router.push('/blog');
            } finally {
                setLoading(false);
            }
        }
        if (slug) fetchPost();
    }, [slug, router]);

    if (loading) return <LoadingScreen />;

    if (!post) return null;

    return (
        <main className={styles.blogWrapper}>
            <HeroBg src="/bg2.png" fixed />
            <div className="premium-container" style={{ paddingTop: '2rem', position: 'relative', zIndex: 1 }}>
                <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <IconArrowLeft /> Back to Blog
                </button>
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
                                {post.author?.name?.charAt(0) || 'A'}
                            </div>
                            <div className={styles.detailAuthorInfo}>
                                <div className={styles.detailAuthorName}>{post.author?.name || 'TalentMesh Editorial'}</div>
                                <div suppressHydrationWarning>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {post.read_minutes || 5} min read</div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </header>

                <AnimateOnScroll animation="fadeUp" delay={100}>
                    <div className={`premium-container ${styles.detailImageWrapper}`}>
                        <div className={styles.detailImageContainer}>
                            <Image
                                src={post.cover_image || "/images/tech-office.jpg"}
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
                            <SafeBlogContent content={post.content || ''} />
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
                            {related.map(rel => (
                                <Link href={`/blog/${rel.slug}`} key={rel.id} style={{ textDecoration: 'none' }}>
                                    <div className={`${styles.relatedCard} glass-card`}>
                                        <div className={styles.relatedImageWrapper}>
                                            <Image src={rel.cover_image || "/images/tech-office.jpg"} alt={rel.title} fill style={{ objectFit: 'cover' }} />
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
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <div className={`premium-container ${styles.detailCtaWrapper}`}>
                <div className={styles.detailCtaBox}>
                    <h2 className={styles.detailCtaTitle}>Enjoyed this article?</h2>
                    <p className={styles.detailCtaDesc}>Subscribe to our newsletter and never miss an update on AI recruitment.</p>
                    <div className={styles.detailCtaForm}>
                        <input type="email" placeholder="your@email.com" className={styles.detailCtaInput} />
                        <button className={styles.detailCtaBtn}>Subscribe Now</button>
                    </div>
                </div>
            </div>
        </main>
    );
}
