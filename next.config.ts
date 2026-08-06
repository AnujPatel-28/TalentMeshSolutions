import type { NextConfig } from "next";

const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;

if (!insforgeUrl) {
  console.warn('⚠️ WARNING: Missing NEXT_PUBLIC_INSFORGE_URL environment variable. API connections and images may fail.');
}

// Comprehensive Content Security Policy granting Next.js development access 
// while explicitly clamping frame-ancestors and restricting API connections to self / InsForge.
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cal.com https://*.cal.com https://app.cal.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://cal.com https://*.cal.com https://app.cal.com https://*.insforge.app https://cdn.insforge.dev https://insforge-storage.s3.us-east-2.amazonaws.com https://*.s3.us-east-2.amazonaws.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://images.unsplash.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.web3forms.com https://cal.com https://*.cal.com https://app.cal.com https://*.insforge.app ${insforgeUrl} https://insforge-storage.s3.us-east-2.amazonaws.com https://*.s3.us-east-2.amazonaws.com https://api.anthropic.com wss:;
    frame-src 'self' blob: https://cal.com https://*.cal.com https://app.cal.com;
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
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.insforge.app",
      },
      {
        protocol: "https",
        hostname: "cdn.insforge.dev",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
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
        source: '/about',
        destination: '/portals/jobs/about',
      },
      {
        source: '/contact',
        destination: '/portals/jobs/contact',
      },
      {
        source: '/candidates',
        destination: '/dashboard/admin/candidates',
      },
      {
        source: '/recruiters',
        destination: '/dashboard/admin/recruiters',
      },
    ];

    return rewritesList;
  },
};

export default nextConfig;
