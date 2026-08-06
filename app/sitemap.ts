import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://talentmeshsolutions.com'; // Adjust this to your actual domain

  const pages = [
    '',
    '/about',
    '/portals/jobs/contact',
    '/jobs',
    '/employers',
    '/job-seekers',
    '/pricing',
    '/features',
    '/blog',
    '/press',
    '/career-advice',
    '/case-studies',
    // '/careers',
    '/privacy',
    '/terms',
    '/security',
  ];

  return pages.map((page) => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: page === '' ? 'daily' : 'weekly',
    priority: page === '' ? 1 : 0.8,
  }));
}
