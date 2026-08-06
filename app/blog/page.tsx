"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './blog.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { publicInsforge } from '@/lib/insforge';
import { LoadingScreen } from '@/components/ui';
import {
  Search,
  ArrowRight,
  Clock,
  Calendar,
  Download,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
  Briefcase,
  Building2,
  Monitor,
  Heart,
  Sparkles,
  CheckSquare,
  DollarSign,
  Mail,
  Award,
  UserCheck,
  Bookmark,
  ChevronRight,
  Flame,
  ArrowUpRight,
} from 'lucide-react';

const TRENDING_TAGS = ["Hiring", "Resume", "Interview", "Remote Work", "ATS", "Career Growth"];

const CATEGORIES_DATA = [
  { name: "Resume", count: 18, icon: FileText },
  { name: "Interview", count: 24, icon: MessageSquare },
  { name: "Career Growth", count: 22, icon: TrendingUp },
  { name: "Hiring", count: 30, icon: Users },
  { name: "HR", count: 20, icon: Briefcase },
  { name: "Workplace", count: 16, icon: Building2 },
  { name: "Remote Work", count: 14, icon: Monitor },
  { name: "Company Culture", count: 12, icon: Heart }
];

const FEATURED_ARTICLE_DEFAULT = {
  id: "featured-1",
  title: "How Recruitment Will Evolve in 2026",
  slug: "how-recruitment-will-evolve-in-2026",
  excerpt: "Explore key trends shaping the future of hiring, and how companies and candidates can stay ahead in a rapidly changing landscape.",
  category: "FEATURED",
  readTime: "6 min read",
  date: "Jul 20, 2026",
  coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80",
  authorName: "TalentMesh Editorial",
};

const LATEST_INSIGHTS_DEFAULT = [
  {
    id: "latest-1",
    title: "How to Build a Resume Recruiters Actually Read",
    slug: "how-to-build-a-resume-recruiters-actually-read",
    excerpt: "Simple tips to make your resume stand out and land more interviews.",
    category: "RESUME",
    readTime: "5 min read",
    date: "Jul 18, 2026",
    coverImage: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80",
    authorName: "Sarah Chen",
  },
  {
    id: "latest-2",
    title: "Top Hiring Trends Every Company Should Know",
    slug: "top-hiring-trends-every-company-should-know",
    excerpt: "Stay updated with the latest hiring trends and what they mean for your business.",
    category: "HIRING",
    readTime: "8 min read",
    date: "Jul 16, 2026",
    coverImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    authorName: "Marcus Johnson",
  },
  {
    id: "latest-3",
    title: "10 Career Growth Habits That Make a Big Difference",
    slug: "10-career-growth-habits-that-make-a-big-difference",
    excerpt: "Small daily habits that can accelerate your career over the long run.",
    category: "CAREER GROWTH",
    readTime: "6 min read",
    date: "Jul 14, 2026",
    coverImage: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80",
    authorName: "Priya Sharma",
  }
];

const POPULAR_ARTICLES = [
  { number: 1, title: "How to Negotiate Salary Confidentially", readTime: "6 min", slug: "how-to-negotiate-salary-confidentially", category: "Career" },
  { number: 2, title: "Top 15 Interview Questions and Answers", readTime: "7 min", slug: "top-15-interview-questions-and-answers", category: "Interview" },
  { number: 3, title: "Resume Mistakes That Cost You Interviews", readTime: "5 min", slug: "resume-mistakes-that-cost-you-interviews", category: "Resume" },
  { number: 4, title: "The Ultimate Hiring Checklist for Employers", readTime: "6 min", slug: "the-ultimate-hiring-checklist-for-employers", category: "Hiring" },
  { number: 5, title: "Career Growth Tips for Every Professional", readTime: "4 min", slug: "career-growth-tips-for-every-professional", category: "Career" }
];

const FREE_RESOURCES = [
  { id: "res-1", title: "Resume Templates", description: "Professional templates to create your best impression.", icon: Sparkles, accent: "blue" },
  { id: "res-2", title: "Interview Checklist", description: "Prepare better and never miss an important step.", icon: FileText, accent: "green" },
  { id: "res-3", title: "Hiring Checklist", description: "A step-by-step guide to streamline your hiring process.", icon: CheckSquare, accent: "indigo" },
  { id: "res-4", title: "Salary Guide", description: "Latest salary insights and benchmarks by role.", icon: DollarSign, accent: "purple" }
];

const TOPICS_DATA = [
  { name: "Recruitment", count: 15, icon: Award },
  { name: "Career Advice", count: 26, icon: Heart },
  { name: "Interview", count: 12, icon: MessageSquare },
  { name: "HR", count: 16, icon: Briefcase },
  { name: "Resume", count: 10, icon: FileText },
  { name: "Workplace", count: 16, icon: Building2 }
];

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = "TalentMesh Blog | Insights, Hiring Advice & Career Growth";
    }
    async function fetchPosts() {
      try {
        const { data, error } = await publicInsforge.database
          .from('blog')
          .select('id, title, slug, excerpt, content, category, cover_image, status, created_at, author_id, author:profiles(name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false });
        if (error) throw new Error((error as any).message || 'Failed to fetch posts');
        setPosts(data || []);
      } catch (err: any) {
        console.error('Fetch posts error:', err);
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) { setSubscribed(true); setEmail(""); setTimeout(() => setSubscribed(false), 5000); }
  };

  const handleTagClick = (tag: string) => {
    setSearch(search.toLowerCase() === tag.toLowerCase() ? "" : tag);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(activeCategory === cat ? "All" : cat);
  };

  const filteredPosts = posts.filter(p => {
    const catMatch = activeCategory === "All" || p.category?.toLowerCase() === activeCategory.toLowerCase();
    const searchMatch = !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const featuredPost = filteredPosts.length > 0 ? {
    id: filteredPosts[0].id,
    title: filteredPosts[0].title,
    slug: filteredPosts[0].slug,
    excerpt: filteredPosts[0].excerpt,
    category: filteredPosts[0].category || "FEATURED",
    readTime: "6 min read",
    date: new Date(filteredPosts[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    coverImage: filteredPosts[0].cover_image || FEATURED_ARTICLE_DEFAULT.coverImage,
    authorName: filteredPosts[0].author?.name || "TalentMesh Editorial",
  } : FEATURED_ARTICLE_DEFAULT;

  const restArticles = filteredPosts.length > 1
    ? filteredPosts.slice(1, 4).map((p, idx) => ({
        id: p.id || `latest-${idx}`,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        category: p.category || "INSIGHTS",
        readTime: "5 min read",
        date: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        coverImage: p.cover_image || LATEST_INSIGHTS_DEFAULT[idx % LATEST_INSIGHTS_DEFAULT.length].coverImage,
        authorName: p.author?.name || LATEST_INSIGHTS_DEFAULT[idx % LATEST_INSIGHTS_DEFAULT.length].authorName,
      }))
    : LATEST_INSIGHTS_DEFAULT;

  const accentMap: Record<string, string> = {
    blue: styles.resAccentBlue,
    green: styles.resAccentGreen,
    indigo: styles.resAccentIndigo,
    purple: styles.resAccentPurple,
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className={styles.blogWrapper}>
      {/* Reading Progress Bar */}
      <div className={styles.progressBarWrap}>
        <div className={styles.progressBarFill} style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* 1. MAGAZINE HERO — Featured Article as Cover */}
      <section ref={heroRef} className={styles.magazineHero}>
        <div className={styles.magazineHeroInner}>
          <AnimateOnScroll animation="fadeUp">
            <div className={styles.magazineCover}>
              <div className={styles.magazineCoverImageWrap}>
                <Image
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  fill
                  className={styles.magazineCoverImage}
                  unoptimized={featuredPost.coverImage.startsWith('http')}
                  priority
                />
                <div className={styles.magazineCoverOverlay} />
              </div>

              <div className={styles.magazineCoverContent}>
                <div className={styles.magazineCoverMetaTop}>
                  <span className={styles.magazineFeaturedBadge}>
                    <Flame size={14} /> Featured Story
                  </span>
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

      {/* 2. SEARCH + CATEGORY PILLS (Sticky) */}
      <div className={styles.stickySearchWrap}>
        <div className="premium-container">
          <div className={styles.searchAndPills}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchBoxIcon} />
              <input
                type="text"
                placeholder="Search articles, topics or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchBoxInput}
              />
            </div>

            <div className={styles.categoryPillsRow}>
              <button
                onClick={() => setActiveCategory("All")}
                className={`${styles.catPill} ${activeCategory === "All" ? styles.catPillActive : ''}`}
              >
                All
              </button>
              {CATEGORIES_DATA.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={`${styles.catPill} ${isActive ? styles.catPillActive : ''}`}
                  >
                    <Icon size={13} />
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <div className={styles.trendingMiniRow}>
              <span className={styles.trendingMiniLabel}>Trending:</span>
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`${styles.trendingMiniPill} ${search.toLowerCase() === tag.toLowerCase() ? styles.trendingMiniPillActive : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. LATEST INSIGHTS — Asymmetric Grid + Sticky Sidebar */}
      <section className={styles.insightsSection}>
        <div className="premium-container">
          <div className={styles.insightsLayout}>
            {/* Left: Articles */}
            <div className={styles.articlesCol}>
              <div className={styles.sectionHeaderRow}>
                <h2 className={styles.sectionHeading}>Latest Insights</h2>
                <button onClick={() => setActiveCategory("All")} className={styles.viewAllLink}>
                  View all <ChevronRight size={16} />
                </button>
              </div>

              {/* Asymmetric Grid: 1 large + 2 stacked */}
              <div className={styles.asymmetricGrid}>
                {/* Large featured card */}
                {restArticles[0] && (
                  <AnimateOnScroll animation="fadeUp" delay={0}>
                    <Link href={`/blog/${restArticles[0].slug}`} className={styles.largeArticleCard}>
                      <div className={styles.largeArticleImageWrap}>
                        <Image
                          src={restArticles[0].coverImage}
                          alt={restArticles[0].title}
                          fill
                          className={styles.largeArticleImage}
                          unoptimized={restArticles[0].coverImage.startsWith('http')}
                        />
                        <div className={styles.largeArticleImageOverlay} />
                      </div>
                      <div className={styles.largeArticleContent}>
                        <span className={styles.articleCategoryBadge}>{restArticles[0].category}</span>
                        <h3 className={styles.largeArticleTitle}>{restArticles[0].title}</h3>
                        <p className={styles.largeArticleExcerpt}>{restArticles[0].excerpt}</p>
                        <div className={styles.largeArticleFooter}>
                          <div className={styles.articleAuthorRow}>
                            <div
                              className={styles.articleAuthorAvatar}
                              style={{ background: getAuthorColor(restArticles[0].authorName) }}
                            >
                              {getAuthorInitials(restArticles[0].authorName)}
                            </div>
                            <span className={styles.articleAuthorName}>{restArticles[0].authorName}</span>
                          </div>
                          <div className={styles.articleMetaRow}>
                            <Clock size={13} /> {restArticles[0].readTime}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </AnimateOnScroll>
                )}

                {/* Two stacked smaller cards */}
                <div className={styles.stackedArticlesCol}>
                  {restArticles.slice(1, 3).map((art, idx) => (
                    <AnimateOnScroll key={art.id} animation="fadeUp" delay={(idx + 1) * 80}>
                      <Link href={`/blog/${art.slug}`} className={styles.stackedArticleCard}>
                        <div className={styles.stackedArticleImageWrap}>
                          <Image
                            src={art.coverImage}
                            alt={art.title}
                            fill
                            className={styles.stackedArticleImage}
                            unoptimized={art.coverImage.startsWith('http')}
                          />
                        </div>
                        <div className={styles.stackedArticleContent}>
                          <span className={styles.articleCategoryBadge}>{art.category}</span>
                          <h4 className={styles.stackedArticleTitle}>{art.title}</h4>
                          <div className={styles.stackedArticleFooter}>
                            <div className={styles.articleAuthorRow}>
                              <div
                                className={styles.articleAuthorAvatarSmall}
                                style={{ background: getAuthorColor(art.authorName) }}
                              >
                                {getAuthorInitials(art.authorName)}
                              </div>
                              <span className={styles.articleAuthorNameSmall}>{art.authorName}</span>
                            </div>
                            <span className={styles.articleMetaSmall}><Clock size={12} /> {art.readTime}</span>
                          </div>
                        </div>
                      </Link>
                    </AnimateOnScroll>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Sticky Sidebar */}
            <aside className={styles.sidebarColSticky}>
              <div className={styles.sidebarInner}>
                {/* Popular */}
                <div className={styles.sidebarCard}>
                  <div className={styles.sidebarCardHeader}>
                    <Flame size={18} className={styles.sidebarCardHeaderIcon} />
                    <h3 className={styles.sidebarCardTitle}>Popular This Month</h3>
                  </div>
                  <div className={styles.popularList}>
                    {POPULAR_ARTICLES.map((item, idx) => (
                      <Link key={item.number} href={`/blog/${item.slug}`} className={styles.popularItem}>
                        <span className={`${styles.popularBadgeNum} ${idx < 3 ? styles.popularBadgeNumTop : ''}`}>
                          {item.number}
                        </span>
                        <div className={styles.popularTextGroup}>
                          <span className={styles.popularItemCategory}>{item.category}</span>
                          <h4 className={styles.popularItemTitle}>{item.title}</h4>
                          <span className={styles.popularMeta}>{item.readTime}</span>
                        </div>
                        <ArrowUpRight size={14} className={styles.popularArrow} />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div className={styles.sidebarCard}>
                  <div className={styles.sidebarCardHeader}>
                    <Bookmark size={18} className={styles.sidebarCardHeaderIcon} />
                    <h3 className={styles.sidebarCardTitle}>Explore Topics</h3>
                  </div>
                  <div className={styles.topicList}>
                    {TOPICS_DATA.map((top) => {
                      const Icon = top.icon;
                      return (
                        <button
                          key={top.name}
                          onClick={() => handleCategoryClick(top.name)}
                          className={styles.topicListItem}
                        >
                          <span className={styles.topicListIcon}><Icon size={14} /></span>
                          <span className={styles.topicListName}>{top.name}</span>
                          <span className={styles.topicListCount}>{top.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* 4. FREE RESOURCES — Glass Cards */}
      <section className={styles.resourcesSection}>
        <div className="premium-container">
          <div className={styles.sectionHeaderRowCentered}>
            <div>
              <h2 className={styles.sectionHeading}>Free Resources</h2>
              <p className={styles.sectionSubheading}>Downloadable guides, templates, and checklists to level up your career.</p>
            </div>
          </div>

          <div className={styles.resourcesGrid}>
            {FREE_RESOURCES.map((res, idx) => {
              const Icon = res.icon;
              return (
                <AnimateOnScroll key={res.id} animation="fadeUp" delay={idx * 80}>
                  <div className={`${styles.glassResourceCard} ${accentMap[res.accent] || ''}`}>
                    <div className={styles.glassResourceIconBox}>
                      <Icon size={22} />
                    </div>
                    <div className={styles.glassResourceBody}>
                      <h3 className={styles.glassResourceTitle}>{res.title}</h3>
                      <p className={styles.glassResourceDesc}>{res.description}</p>
                    </div>
                    <button className={styles.glassResourceBtn} aria-label={`Download ${res.title}`}>
                      <Download size={16} />
                    </button>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. NEWSLETTER — Dark Premium Banner */}
      <section className={styles.newsletterSection}>
        <div className="premium-container">
          <AnimateOnScroll animation="scaleUp">
            <div className={styles.newsletterDarkCard}>
              <div className={styles.newsletterDarkLeft}>
                <div className={styles.newsletterDarkIconWrap}>
                  <Mail size={32} />
                </div>
              </div>
              <div className={styles.newsletterDarkCenter}>
                <h2 className={styles.newsletterDarkTitle}>Stay in the loop</h2>
                <p className={styles.newsletterDarkDesc}>
                  Get practical hiring and career insights delivered to your inbox. No spam, unsubscribe anytime.
                </p>
              </div>
              <div className={styles.newsletterDarkRight}>
                {subscribed ? (
                  <div className={styles.subscribedState}>
                    <CheckSquare size={20} />
                    <span>You&apos;re subscribed!</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className={styles.newsletterDarkForm}>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.newsletterDarkInput}
                    />
                    <button type="submit" className={styles.newsletterDarkBtn}>
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* 6. DUAL CTA BANNERS */}
      <section className={styles.dualBannersSection}>
        <div className="premium-container">
          <div className={styles.dualBannersGrid}>
            <AnimateOnScroll animation="fadeUp" delay={0}>
              <Link href="/portals/jobs/careers" className={styles.actionBannerCard}>
                <div className={styles.actionBannerContent}>
                  <div className={styles.actionBannerBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>
                    <Briefcase size={14} /> For Job Seekers
                  </div>
                  <h3 className={styles.actionBannerTitle}>Looking for your next opportunity?</h3>
                  <p className={styles.actionBannerDesc}>Explore thousands of jobs and find the right fit for you.</p>
                  <span className={styles.actionBannerLink}>
                    Find Jobs <ArrowRight size={14} />
                  </span>
                </div>
                <div className={styles.actionBannerIconWrap} style={{ background: '#2563eb' }}>
                  <Briefcase size={32} />
                </div>
              </Link>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp" delay={80}>
              <Link href="/employers" className={styles.actionBannerCard}>
                <div className={styles.actionBannerContent}>
                  <div className={styles.actionBannerBadge} style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <UserCheck size={14} /> For Employers
                  </div>
                  <h3 className={styles.actionBannerTitle}>Need hiring help?</h3>
                  <p className={styles.actionBannerDesc}>Find top talent and build your dream team with AI-powered matching.</p>
                  <span className={styles.actionBannerLink}>
                    For Employers <ArrowRight size={14} />
                  </span>
                </div>
                <div className={styles.actionBannerIconWrap} style={{ background: '#16a34a' }}>
                  <UserCheck size={32} />
                </div>
              </Link>
            </AnimateOnScroll>
          </div>
        </div>
      </section>
    </main>
  );
}
