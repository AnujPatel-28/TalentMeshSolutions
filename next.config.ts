import type { NextConfig } from "next";

// Content Security Policy for the marketing site: no backend, so connect-src only needs
// Web3Forms (lead-capture forms) and Sanity (blog content + images).
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://images.unsplash.com https://cdn.sanity.io;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.web3forms.com https://*.api.sanity.io https://*.apicdn.sanity.io;
    frame-src 'self' blob:;
    frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 2,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  // Static media under public/ is not content-hashed, so it must not be marked
  // immutable — a replaced file would be stuck in browser caches. A day of hard
  // caching plus a week of background revalidation keeps repeat visits off the
  // network with bounded staleness; rename the file if a change must land at once.
  // Does not apply to /_next/image, which the optimizer caches separately.
  async headers() {
    return [
      {
        source: "/:path*.(png|jpg|jpeg|webp|avif|svg|ico|mp4|webm|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
  async rewrites() {
    const rewritesList = [
      {
        source: '/job-seekers',
        destination: '/portals/jobs/job-seekers',
      },
      {
        source: '/contact',
        destination: '/portals/jobs/contact',
      },
    ];

    return rewritesList;
  },
};

export default nextConfig;
