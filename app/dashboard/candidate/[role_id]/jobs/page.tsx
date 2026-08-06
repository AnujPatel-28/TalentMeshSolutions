"use client";
import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function JobsRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const roleId = params.role_id as string;

    useEffect(() => {
        if (roleId) {
            router.replace(`/dashboard/candidate/${roleId}`);
        }
    }, [roleId, router]);

    return null;
}
