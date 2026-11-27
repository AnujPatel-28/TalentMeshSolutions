/**
 * Starts the zoom of the home intro: hands the intro canvas to the worker in
 * public/intro-dive-worker.js, which draws the zoom off the main thread.
 *
 * HomeIntro inlines this function's source as a script right after the intro
 * markup, so on a full page load it runs while the HTML is parsed, before the
 * app hydrates. HomeIntroSeen calls it too, for arriving at the home page by
 * in-app navigation. It must stay self-contained (no imports or outer
 * variables), because it is serialised with `toString()`.
 *
 * It does nothing if the intro has already played in this tab, for reduced
 * motion, if it already ran, or where OffscreenCanvas is missing; the static
 * logo then simply fades out on its CSS timeline.
 */
export function bootIntro() {
    try {
        if (document.documentElement.classList.contains('tm-intro-seen')) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const canvas = document.getElementById('tm-intro-canvas') as
            | (HTMLCanvasElement & { tmBooted?: boolean })
            | null;
        const letters = document.getElementById('tm-intro-letters')?.getAttribute('d');
        const t = document.getElementById('tm-intro-t')?.getAttribute('d');
        if (!canvas || canvas.tmBooted || !letters || !t) return;
        if (!('transferControlToOffscreen' in canvas) || !('Worker' in window)) return;
        canvas.tmBooted = true;
        const offscreen = canvas.transferControlToOffscreen();
        const worker = new Worker('/intro-dive-worker.js');
        worker.postMessage(
            {
                canvas: offscreen,
                letters,
                t,
                w: window.innerWidth,
                h: window.innerHeight,
                dpr: Math.min(window.devicePixelRatio || 1, 2),
                start: performance.timeOrigin + performance.now(),
            },
            [offscreen]
        );
    } catch {
        // Leave the static logo to its CSS fade.
    }
}
