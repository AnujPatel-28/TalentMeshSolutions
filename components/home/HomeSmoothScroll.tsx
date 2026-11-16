'use client';

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Smooth wheel scrolling for the home page only. Lenis evens out wheel input
 * so a hard flick moves the page at a controlled pace, which keeps the pinned
 * hero and services sections readable. It still scrolls the real window, so
 * the page's own scroll listeners, sticky positioning and anchor links work
 * unchanged. Touch scrolling is left native (Lenis's default), and it is not
 * started at all for reduced-motion visitors. Mounted from app/page.tsx, so it
 * is torn down on navigating away.
 */
export default function HomeSmoothScroll() {
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (reduceMotion) return;
        const lenis = new Lenis({
            autoRaf: true,
            anchors: true,
            // Menus and other inner scroll areas keep their own scrolling.
            allowNestedScroll: true,
        });
        return () => lenis.destroy();
    }, [reduceMotion]);

    return null;
}
