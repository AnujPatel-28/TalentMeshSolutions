"use client";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/login", "/signup", "/forgot-password", "/dashboard", "/candidate", "/recruiter", "/onboarding", "/admin", "/candidates", "/recruiters", "/company"];

interface NavbarWrapperProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

export default function NavbarWrapper({ children, showFooter = false }: NavbarWrapperProps) {
    const pathname = usePathname();
    const isHidden = HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

    if (isHidden) return null;

    return <>{children}</>;
}
