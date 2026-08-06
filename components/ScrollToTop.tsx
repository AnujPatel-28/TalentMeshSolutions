"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        const html = document.querySelector('html');
        if (html) {
            // Temporarily disable smooth scroll behavior to force instant scroll
            html.style.scrollBehavior = 'auto';
            window.scrollTo({ top: 0, behavior: 'auto' });

            // Restore smooth scrolling for page anchors after a short render delay
            const timer = setTimeout(() => {
                html.style.scrollBehavior = 'smooth';
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [pathname]);

    return null;
}
