"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { CandidateTopNavSkeleton, OpsSidebarSkeleton } from '@/components/ui/RedirectSkeletons';
import CandidateTopNavShell from '@/components/dashboard/CandidateTopNavShell';
import OpsDarkSidebarShell from '@/components/dashboard/OpsDarkSidebarShell';

export default function LayoutSwitcher({ children }: { children: React.ReactNode }) {
    const { isLoading, isInitialized, user } = useAuth();
    const pathname = usePathname();

    // Show high-fidelity skeleton UI loader during session initialization / loading state
    if (isLoading || !isInitialized) {
        const isCandidate = pathname.includes('/candidate/');
        if (isCandidate) {
            return <CandidateTopNavSkeleton label="Initializing session..." />;
        }
        return <OpsSidebarSkeleton label="Initializing session..." />;
    }

    const isCandidateRoute = pathname.startsWith('/dashboard/candidate/') ||
                             pathname.startsWith('/candidate/') ||
                             (user && user.role !== 'recruiter' && user.role !== 'admin' && user.role !== 'super_admin');

    if (isCandidateRoute) {
        return <CandidateTopNavShell>{children}</CandidateTopNavShell>;
    }

    // Recruiter & Admin dashboard routes use the new OpsDarkSidebarShell
    return <OpsDarkSidebarShell>{children}</OpsDarkSidebarShell>;
}
