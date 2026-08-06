import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist, Overlock, Manrope, Outfit, Space_Grotesk, Sora, Playfair_Display } from "next/font/google";
import { Navbar, Footer, NavbarWrapper } from "@/components/layout";
import "./globals.css";
import layoutStyles from "./layout.module.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const overlock = Overlock({
  variable: "--font-overlock",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
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
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
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
  "@type": "Organization",
  name: "TalentMesh Solutions",
  url: SITE_URL,
  logo: `${SITE_URL}/TalentMesh_page-0002-removebg-preview.png`,
  description: "TalentMesh Solutions is a next-generation recruitment platform connecting employers and job seekers across India.",
  email: "info@talentmeshsolutions.com",
  telephone: "+91-98981-61106",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3rd Floor, Chinubhai House, 7-B Amrutbaug Colony, Navjivan",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    postalCode: "380014",
    addressCountry: "IN",
  },
  sameAs: [
    "https://x.com/TalentmeshS",
    "https://www.linkedin.com/company/talentmesh-solutions/",
    "https://www.instagram.com/talentmesh_",
  ],
};

import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import ScrollToTop from "@/components/ScrollToTop";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const skipHeaderFooter = pathname.startsWith("/login");

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${jakarta.variable} ${geist.variable} ${overlock.variable} ${manrope.variable} ${outfit.variable} ${spaceGrotesk.variable} ${sora.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ScrollToTop />
        {!skipHeaderFooter ? (
          <div className={layoutStyles.rootFlexContainer}>
            <NavbarWrapper>
              <Navbar />
            </NavbarWrapper>
            <div className={layoutStyles.mainContentGrow}>
              {children}
            </div>
            <NavbarWrapper showFooter>
              <Footer />
            </NavbarWrapper>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
