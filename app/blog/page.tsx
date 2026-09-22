import Link from 'next/link';
import { sanityClient } from '@/lib/sanity/client';
import { POSTS_LIST_QUERY } from '@/lib/sanity/queries';
import { PostPreview, type BlogPost } from './post-preview';
import styles from './blog.module.css';

export const revalidate = 60;

export default async function BlogPage() {
  const posts = (await sanityClient.fetch<BlogPost[] | null>(POSTS_LIST_QUERY)) ?? [];
  const [featured, ...others] = posts;
  return (
    <main className={styles.journal} id="blog-main">
      <div className={styles.container}>
        <header className={styles.intro}>
          <p className={styles.publication}>TalentMesh Journal</p>
          <h1>Ideas for a changing<br className={styles.desktopBreak} /> world of work.</h1>
          <p className={styles.introDescription}>Practical perspectives on hiring, skills, technology, and better ways to work.</p>
        </header>
        {featured ? <PostPreview post={featured} featured /> : (
          <section className={styles.empty}><h2>Our next chapter is on its way.</h2><p>New perspectives and practical guides will appear here as they’re published.</p><Link href="/">Explore TalentMesh</Link></section>
        )}
        {others.length > 0 && (
          <section className={styles.archive} aria-labelledby="more-stories">
            <div className={styles.sectionHeader}><h2 id="more-stories">More from the journal</h2><span>{others.length} {others.length === 1 ? 'article' : 'articles'}</span></div>
            <div className={styles.postGrid}>{others.map(post => <PostPreview key={post.id} post={post} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
