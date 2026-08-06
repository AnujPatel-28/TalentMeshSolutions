import { MetadataRoute } from 'next';
import { sanityClient } from '@/lib/sanity/client';

const BLOG_SLUGS_QUERY = `*[_type == "post" && status == "published" && defined(slug.current)]{"slug": slug.current, publishedAt}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://talentmeshsolutions.com'; // Adjust this to your actual domain

  const pages = [
    '',
    '/job-seekers',
    '/about',
    '/contact',
    '/podcast',
    '/security',
    '/portals/jobs/career-advice',
    '/portals/jobs/careers',
    '/portals/jobs/companies',
    '/portals/jobs/salaries',
    '/employers',
    '/employers/post-job',
    '/employers/sourcing',
    '/employers/products',
    '/employers/rpo',
    '/blog',
    '/login',
    '/privacy',
    '/terms',
  ];

  const staticEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: page === '' ? 'daily' : 'weekly',
    priority: page === '' ? 1 : 0.8,
  }));

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await sanityClient.fetch(BLOG_SLUGS_QUERY);
    blogEntries = (posts || []).map((post: { slug: string; publishedAt: string }) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error('Failed to fetch blog posts for sitemap:', err);
  }

  return [...staticEntries, ...blogEntries];
}
