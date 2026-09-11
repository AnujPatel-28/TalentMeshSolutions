import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import Image from '../blog-image';
import { notFound } from 'next/navigation';
import { PortableText, type PortableTextComponents } from 'next-sanity';
import type { PortableTextBlock } from '@portabletext/types';
import { ArrowLeft } from 'lucide-react';
import styles from '../blog.module.css';
import ArticleContents from '../article-contents';
import { sanityClient } from '@/lib/sanity/client';
import { urlForImage } from '@/lib/sanity/image';
import { POST_BY_SLUG_QUERY, RELATED_POSTS_QUERY } from '@/lib/sanity/queries';
import { PostMeta, PostPreview, displayDate, type BlogPost } from '../post-preview';

const SITE_URL = 'https://talentmeshsolutions.com';
type ArticlePost = BlogPost & { body: PortableTextBlock[] };
export const revalidate = 60;
const getPost = cache(async (slug: string) => sanityClient.fetch<ArticlePost | null>(POST_BY_SLUG_QUERY, { slug }));
const headingId = (key = '') => 'section-' + key.replace(/[^a-zA-Z0-9_-]/g, '');
const ptComponents: PortableTextComponents = {
  block: {
    h1: ({ children, value }) => <h2 id={headingId(value._key)}>{children}</h2>,
    h2: ({ children, value }) => <h2 id={headingId(value._key)}>{children}</h2>,
    h3: ({ children, value }) => <h3 id={headingId(value._key)}>{children}</h3>,
    h4: ({ children, value }) => <h4 id={headingId(value._key)}>{children}</h4>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === 'string' ? value.href : '';
      if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) || href.startsWith('//')) return <>{children}</>;
      return <a href={href}>{children}</a>;
    },
  },
  types: {
    image: ({ value }) => {
      const src = urlForImage(value)?.width(1400).auto('format').url();
      if (!src) return null;
      return <figure>
        {/* CMS image dimensions vary; preserve the complete image without cropping. */}

        <img src={src} alt={value.alt || ''} loading="lazy" decoding="async" />
        {value.caption && <figcaption>{value.caption}</figcaption>}
      </figure>;
    },
    code: ({ value }) => <pre><code>{value.code}</code></pre>,
    table: ({ value }) => {
      const rows = value.rows as { _key?: string; cells: string[] }[] | undefined;
      if (!rows?.length) return null;
      return <div className={styles.tableScroll} role="region" aria-label="Article table" tabIndex={0}><table><tbody>{rows.map((row, i) => <tr key={row._key || i}>{row.cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    },
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Article not found', robots: { index: false, follow: true } };
  const image = post.coverImage ? urlForImage(post.coverImage)?.width(1200).height(630).auto('format').url() : undefined;
  return {
    title: post.title, description: post.excerpt,
    alternates: { canonical: '/blog/' + slug },
    openGraph: { title: post.title, description: post.excerpt, url: SITE_URL + '/blog/' + slug, siteName: 'TalentMesh Solutions', type: 'article', publishedTime: displayDate(post.publishedAt) ? post.publishedAt : undefined, authors: [post.authorName || 'TalentMesh Editorial'], images: image ? [{ url: image, width: 1200, height: 630 }] : undefined },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: image ? [image] : undefined },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  // Related content is supplemental: its outage must not hide a readable article.
  const related = post.category ? await sanityClient.fetch<BlogPost[]>(RELATED_POSTS_QUERY, { category: post.category, id: post.id }).catch(() => []) : [];
  const image = post.coverImage ? urlForImage(post.coverImage)?.width(1600).auto('format').url() : undefined;
  const body = Array.isArray(post.body) ? post.body : [];
  const headings = body.filter(block => block._type === 'block' && ['h1', 'h2'].includes(block.style || '') && block._key).map(block => ({ id: headingId(block._key), text: block.children.map(child => child.text || '').join('') })).filter(heading => heading.text);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
    description: post.excerpt, mainEntityOfPage: SITE_URL + '/blog/' + slug,
    image: image ? [image] : undefined,
    datePublished: displayDate(post.publishedAt) ? post.publishedAt : undefined,
    author: { '@type': post.authorName && !/talentmesh|editorial/i.test(post.authorName) ? 'Person' : 'Organization', name: post.authorName || 'TalentMesh Editorial' },
    publisher: { '@type': 'Organization', name: 'TalentMesh Solutions', url: SITE_URL },
  };
  return (
    <main className={styles.journal} id="blog-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className={styles.articleContainer}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/blog">Journal</Link>{post.category && <><span aria-hidden="true">/</span><span>{post.category}</span></>}</nav>
        <article>
          <header className={styles.articleHeader}><h1>{post.title}</h1>{post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}<PostMeta post={post} /></header>
          {image && <div className={styles.articleCover}><Image src={image} alt={post.coverImage?.alt || ''} fill priority sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 980px) calc(100vw - 80px), 900px" /></div>}
          <div className={headings.length ? styles.readingLayout : undefined}>
            {headings.length > 0 && <ArticleContents headings={headings} />}
            <div className={styles.prose}><PortableText value={body} components={ptComponents} /></div>
          </div>
        </article>
        <div className={styles.articleEnd}><Link href="/blog" className={styles.readLink}><ArrowLeft size={18} aria-hidden="true" /> Back to the journal</Link></div>
      </div>
      {!!related?.length && <section className={[styles.container, styles.archive].join(' ')} aria-labelledby="related-title"><div className={styles.sectionHeader}><h2 id="related-title">Keep exploring</h2></div><div className={styles.postGrid}>{related.map(item => <PostPreview key={item.id} post={item} />)}</div></section>}
    </main>
  );
}
