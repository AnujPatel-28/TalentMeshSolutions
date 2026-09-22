import Image from './blog-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SanityImageSource } from '@sanity/image-url';
import { urlForImage } from '@/lib/sanity/image';
import styles from './blog.module.css';

export type BlogPost = {
  id: string; title: string; slug: string; excerpt?: string; category?: string;
  coverImage?: SanityImageSource & { alt?: string }; authorName?: string;
  publishedAt?: string; readTimeMinutes?: number;
};

export function displayDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export function PostMeta({ post }: { post: BlogPost }) {
  const date = displayDate(post.publishedAt);
  return <div className={styles.meta}><span>{post.authorName || 'TalentMesh Editorial'}</span>{date && <time dateTime={post.publishedAt}>{date}</time>}{!!post.readTimeMinutes && post.readTimeMinutes > 0 && <span>{post.readTimeMinutes} min read</span>}</div>;
}

export function PostPreview({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const image = post.coverImage ? urlForImage(post.coverImage)?.width(featured ? 1400 : 800).auto('format').url() : undefined;
  const href = '/blog/' + post.slug;
  return (
    <article className={[featured ? styles.feature : styles.post, !image ? styles.textOnly : ''].join(' ')}>
      {image && <Link href={href} className={styles.cover} tabIndex={-1} aria-hidden="true"><Image src={image} alt={post.coverImage?.alt || ''} fill sizes={featured ? '(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) 55vw, 660px' : '(max-width: 760px) calc(100vw - 40px), 380px'} priority={featured} /></Link>}
      <div className={styles.storyCopy}>
        {post.category && <p className={styles.category}>{post.category}</p>}
        <h2><Link href={href}>{post.title}</Link></h2>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <PostMeta post={post} />
        <Link href={href} className={styles.readLink}>Read article <ArrowRight size={18} aria-hidden="true" /><span className={styles.srOnly}>: {post.title}</span></Link>
      </div>
    </article>
  );
}
