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

export const metadata: Metadata = {
  title: {
    default: "TalentMesh | Next-Gen AI Recruitment & Smart Matching",
    template: "%s | TalentMesh Solutions | AI Recruiting Platform"
  },
  description: "Experience the future of hiring with TalentMesh. Our AI-powered platform connects top tech talent with world-class companies using advanced skill-matching algorithms. Hire faster, smarter, and more efficiently.",
  keywords: ["AI Recruitment Platform", "AI Job Matching", "Tech Recruitment", "Smart Hiring", "Talent Acquisition Software", "Recruitment Automation"],
  authors: [{ name: "TalentMesh Team" }],
  openGraph: {
    title: "TalentMesh | Revolutionary AI-Powered Recruitment",
    description: "Connect with the best opportunities using our advanced AI matching technology.",
    url: "https://talentmesh solutions.com",
    siteName: "TalentMesh",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentMesh Solutions | AI Recruitment Platform",
    description: "Hire top talent with the power of AI.",
  },
  verification: {
    google: "https://talentmeshsolutions.com",
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
    title: 'Talentmesh',
    statusBarStyle: 'default',
    capable: true,
  },
};

import { AuthProvider } from "@/lib/auth/AuthContext";
import QueryProvider from "@/components/providers/QueryProvider";
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
  const host = headersList.get("host") || "";
  const pathname = headersList.get("x-pathname") || "";
  const isPortal = host.startsWith("jobs.") || host.startsWith("app.") || host.startsWith("admin.");
  const isAuthRoute = pathname.startsWith("/login") || 
                      pathname.startsWith("/signup") || 
                      pathname.startsWith("/auth") || 
                      pathname.startsWith("/onboarding");
  const skipHeaderFooter = isPortal || isAuthRoute;

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${jakarta.variable} ${geist.variable} ${overlock.variable} ${manrope.variable} ${outfit.variable} ${spaceGrotesk.variable} ${sora.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
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
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
