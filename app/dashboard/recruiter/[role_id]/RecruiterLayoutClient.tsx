"use client";

import React from 'react';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

/**
 * RecruiterLayoutClient — Now a pass-through wrapper.
 * The shared dashboard layout (app/dashboard/layout.tsx) provides the sidebar,
 * topbar, search, notifications, and all shell functionality for recruiter routes.
 * This component only wraps children in an error boundary for recruiter-specific error handling.
 *
 * companyId/memberRole are resolved by the server guard in layout.tsx and passed down so client
 * code does not re-derive them from client-held auth state (06 "Data fetching"). They are UX
 * inputs only — the layout RSC is the enforcement boundary.
 */
export default function RecruiterLayoutClient({ children }: {
    children: React.ReactNode;
    companyId: string;
    memberRole: string;
}) {
    return (
        <GlobalErrorBoundary>
            {children}
        </GlobalErrorBoundary>
    );
}
