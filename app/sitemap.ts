import { MetadataRoute } from 'next';
import { sanityClient } from '@/lib/sanity/client';

const BLOG_SLUGS_QUERY = `*[_type == "post" && status == "published" && defined(slug.current)]{"slug": slug.current, publishedAt}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://talentmeshsolutions.com'; // Adjust this to your actual domain

  const pages = [
    '',
    '/about',
    '/job-seekers',
    '/contact',
    '/career-advice',
    '/employers/post-job',
    '/talentmesh-portal',
    // TEMP-HIDDEN: /employers/sourcing — restore when page is finalized.
    // '/employers/sourcing',
    '/contingent-staffing',
    '/contract-to-hire',
    '/recruitment-process-outsourcing',
    '/managed-talent-solutions',
    '/remote-hiring-solutions',
    '/technology-talent-sourcing',
    '/gcc-setup-and-build',
    '/offshore-staffing',
    '/executive-search',
    '/direct-hire-recruitment',
    '/hire-train-deploy',
    '/skill-upskilling',
    '/blog',
    '/login',
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
