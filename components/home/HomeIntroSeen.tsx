'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Client half of HomeIntro. The inline script there only runs on a full page
 * load, so this handles arriving at the home page by in-app navigation: if the
 * intro has already played in this tab, hide it before paint; otherwise record
 * that it is playing now.
 */
export default function HomeIntroSeen({ flag }: { flag: string }) {
    // Strict Mode runs effects twice on mount; without this the second pass
    // would find the flag the first one just set and hide the intro mid-play.
    const ran = useRef(false);

    useLayoutEffect(() => {
        if (ran.current) return;
        ran.current = true;
        try {
            if (sessionStorage.getItem(flag)) {
                document.documentElement.classList.add(flag);
            } else {
                sessionStorage.setItem(flag, '1');
            }
        } catch {
            // Storage blocked: the intro simply plays on every load.
        }
    }, [flag]);

    return null;
}
