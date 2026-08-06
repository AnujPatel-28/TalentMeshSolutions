import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /dashboard/ is the real authenticated area. The previous value here was '/private/',
      // which is not a route in this app — it was dead because public/robots.txt (which did
      // disallow /dashboard/) shadowed this route entirely. That static file has been removed.
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: 'https://talentmeshsolutions.com/sitemap.xml',
  };
}
