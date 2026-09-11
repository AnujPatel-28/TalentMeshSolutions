import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist, Manrope, Schibsted_Grotesk, Playfair_Display, Instrument_Serif } from "next/font/google";
import { SiteChrome } from "@/components/layout";
import { SERVICES } from "@/content/home";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  preload: false,
});


const SITE_URL = "https://talentmeshsolutions.com";

export const metadata: Metadata = {
  title: {
    default: "TalentMesh Solutions | Next-Gen Recruitment Platform",
    template: "%s | TalentMesh Solutions",
  },
  description: "TalentMesh Solutions is a next-generation recruitment platform connecting employers and job seekers across India. Post jobs, source talent, and get expert recruitment assistance in one place.",
  keywords: ["TalentMesh Solutions", "Recruitment Platform India", "Job Board", "Talent Sourcing", "Post a Job", "Recruitment Agency India", "Hiring Platform"],
  authors: [{ name: "TalentMesh Solutions" }],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TalentMesh Solutions | Next-Gen Recruitment Platform",
    description: "Connecting employers and job seekers with a next-generation, streamlined hiring platform.",
    url: SITE_URL,
    siteName: "TalentMesh Solutions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentMesh Solutions | Next-Gen Recruitment Platform",
    description: "Post jobs, source talent, and hire faster with TalentMesh Solutions.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'TalentMesh Solutions',
    statusBarStyle: 'default',
    capable: true,
  },
};

// Structured data (schema.org Organization) — helps both traditional search
// engines and AI answer engines (Perplexity, ChatGPT search, Google AI
// Overviews) identify and cite TalentMesh Solutions accurately.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "EmploymentAgency"],
  "@id": `${SITE_URL}/#org`,
  name: "TalentMesh Solutions",
  legalName: "Talentmesh Solution Pvt. Ltd.",
  url: SITE_URL,
  logo: `${SITE_URL}/TalentMesh_page-0002-removebg-preview.png`,
  description: "TalentMesh Solutions is a professional, result-driven recruitment and staffing firm delivering end-to-end manpower services across India.",
  email: "info@talentmeshsolutions.com",
  telephone: "+91-98981-61106",
  areaServed: { "@type": "Country", name: "India" },
  address: {
    "@type": "PostalAddress",
    streetAddress: "7-B, Amrut Bag Colony, Opp. Stadium, Nr. Hindu Colony, Navrangpura",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    postalCode: "380009",
    addressCountry: "IN",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Recruitment & Staffing Services",
    itemListElement: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
      },
    })),
  },
  sameAs: [
    "https://x.com/TalentmeshS",
    "https://www.linkedin.com/company/talentmesh-solutions/",
    "https://www.instagram.com/talentmesh_",
  ],
};

import { cn } from "@/lib/utils";
import ScrollToTop from "@/components/ScrollToTop";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script in <head> adds `js-ready` to
    // this element before React hydrates, which is a deliberate mismatch.
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so scroll-reveal wrappers can hide themselves
            in CSS. Without scripting the class never lands and content stays
            visible — see the `.aos` rules in globals.css. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js-ready')`,
          }}
        />
        {/* Belt for the sections still entering via framer-motion variants
            (TrustStrip, WhyUs), whose `initial` props serialise to inline
            opacity:0 in the server HTML. */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
      </head>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${jakarta.variable} ${manrope.variable} ${schibstedGrotesk.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ScrollToTop />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
