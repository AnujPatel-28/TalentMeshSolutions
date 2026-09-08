"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar/Navbar";
import Footer from "./Footer/Footer";
import NavbarWrapper from "./NavbarWrapper";
import layoutStyles from "@/app/layout.module.css";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipHeaderFooter = pathname?.startsWith("/login") ?? false;

  if (skipHeaderFooter) {
    return <>{children}</>;
  }

  return (
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
  );
}
