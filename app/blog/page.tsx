"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './blog.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { sanityClient } from '@/lib/sanity/client';
import { urlForImage } from '@/lib/sanity/image';
import { POSTS_LIST_QUERY } from '@/lib/sanity/queries';
import { LoadingScreen } from '@/components/ui';
import {
  ArrowRight,
  Clock,
  Calendar,
} from 'lucide-react';

function getAuthorInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAuthorColor(name: string) {
  const colors = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await sanityClient.fetch(POSTS_LIST_QUERY);
        setPosts((data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          category: p.category,
          date: new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          readTime: `${p.readTimeMinutes} min read`,
          coverImage: p.coverImage ? urlForImage(p.coverImage)?.width(1400).url() : undefined,
          authorName: p.authorName || 'TalentMesh Editorial',
        })));
      } catch (err) {
        console.error('Failed to fetch posts from Sanity:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) return <LoadingScreen />;

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <main className={styles.blogWrapper}>
      {/* Reading Progress Bar */}
      <div className={styles.progressBarWrap}>
        <div className={styles.progressBarFill} style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* FEATURED POST */}
      {featuredPost ? (
        <section className={styles.magazineHero}>
          <div className={styles.magazineHeroInner}>
            <AnimateOnScroll animation="fadeUp">
              <div className={styles.magazineCover}>
                <div className={styles.magazineCoverImageWrap}>
                  {featuredPost.coverImage && (
                    <Image
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      fill
                      className={styles.magazineCoverImage}
                      unoptimized
                      priority
                    />
                  )}
                  <div className={styles.magazineCoverOverlay} />
                </div>

                <div className={styles.magazineCoverContent}>
                  <div className={styles.magazineCoverMetaTop}>
                    <span className={styles.magazineCategoryPill}>{featuredPost.category}</span>
                  </div>

                  <h1 className={styles.magazineCoverTitle}>
                    <Link href={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                  </h1>

                  <p className={styles.magazineCoverExcerpt}>{featuredPost.excerpt}</p>

                  <div className={styles.magazineCoverBottom}>
                    <div className={styles.magazineAuthorRow}>
                      <div
                        className={styles.magazineAuthorAvatar}
                        style={{ background: getAuthorColor(featuredPost.authorName) }}
                      >
                        {getAuthorInitials(featuredPost.authorName)}
                      </div>
                      <div>
                        <span className={styles.magazineAuthorName}>{featuredPost.authorName}</span>
                        <div className={styles.magazineMetaRow}>
                          <span className={styles.metaItem}><Clock size={14} /> {featuredPost.readTime}</span>
                          <span className={styles.metaDot}>•</span>
                          <span className={styles.metaItem}><Calendar size={14} /> {featuredPost.date}</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/blog/${featuredPost.slug}`} className={styles.magazineReadBtn}>
                      Read Article <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      ) : (
        <section className={styles.emptyBlogState}>
          <h1>New stories are on their way</h1>
          <p>We&apos;re working on our first articles — check back soon.</p>
        </section>
      )}

      {/* MORE POSTS */}
      {otherPosts.length > 0 && (
        <section className={styles.insightsSection}>
          <div className="premium-container">
            <h2 className={styles.sectionHeading}>More from the blog</h2>
            <div className={styles.postsGrid}>
              {otherPosts.map((post, idx) => (
                <AnimateOnScroll key={post.id} animation="fadeUp" delay={idx * 80}>
                  <Link href={`/blog/${post.slug}`} className={styles.largeArticleCard}>
                    <div className={styles.largeArticleImageWrap}>
                      {post.coverImage && (
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          className={styles.largeArticleImage}
                          unoptimized
                        />
                      )}
                      <div className={styles.largeArticleImageOverlay} />
                    </div>
                    <div className={styles.largeArticleContent}>
                      <span className={styles.articleCategoryBadge}>{post.category}</span>
                      <h3 className={styles.largeArticleTitle}>{post.title}</h3>
                      <p className={styles.largeArticleExcerpt}>{post.excerpt}</p>
                      <div className={styles.largeArticleFooter}>
                        <div className={styles.articleAuthorRow}>
                          <div
                            className={styles.articleAuthorAvatar}
                            style={{ background: getAuthorColor(post.authorName) }}
                          >
                            {getAuthorInitials(post.authorName)}
                          </div>
                          <span className={styles.articleAuthorName}>{post.authorName}</span>
                        </div>
                        <div className={styles.articleMetaRow}>
                          <Clock size={13} /> {post.readTime}
                        </div>
                      </div>
                    </div>
                  </Link>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
