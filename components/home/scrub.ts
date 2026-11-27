/**
 * Scroll "scrub" smoothing for the home page's scroll-driven sections.
 *
 * Tying an animation straight to scroll position makes it jump as far as the
 * scroll does, so a hard flick of the wheel flashes through it. A scrub keeps
 * its own value and eases it toward the scroll-derived target every frame, so
 * the same flick becomes a short glide. The page itself still scrolls natively.
 *
 * `read` returns the target (px); `apply` renders a value. Call `kick` on
 * scroll, `snap` to jump straight to the target (first paint, after a
 * re-measure), and `stop` on cleanup.
 */
export function createScrub(read: () => number, apply: (value: number) => void, halfLifeMs = 90) {
    let value = 0;
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
        const target = read();
        const dt = Math.min(64, now - last);
        last = now;
        value += (target - value) * (1 - Math.pow(0.5, dt / halfLifeMs));
        if (Math.abs(target - value) < 0.4) {
            value = target;
            frame = 0;
        } else {
            frame = requestAnimationFrame(tick);
        }
        apply(value);
    };

    return {
        kick() {
            if (frame) return;
            last = performance.now();
            frame = requestAnimationFrame(tick);
        },
        snap() {
            value = read();
            apply(value);
        },
        stop() {
            cancelAnimationFrame(frame);
            frame = 0;
        },
    };
}
