/*
 * Draws the zoom of the home page intro (components/home/HomeIntro.tsx) on an
 * OffscreenCanvas, off the main thread, so it stays smooth while the page is
 * still loading and hydrating.
 *
 * The main thread sends one message: { canvas, letters, t, w, h, dpr, start }.
 * `start` is the moment the intro began, as epoch ms (timeOrigin + now), so
 * this clock lines up with the CSS clock of the static logo underneath.
 *
 * Each frame is the white cover with the logo's letters cut out (even-odd),
 * scaled about a solid point in the second "t" of the logo, plus the logo ink
 * fading out over it. When the zoom ends the canvas is cleared and the worker
 * stops. Logo units are the 2172 x 724 pixel space the paths are drawn in.
 */
const LOGO_W = 2172;
const LOGO_H = 724;
const FOCUS = { x: 1043, y: 362, r: 16 }; // r: radius of the solid area around it

// Seconds from the start of the intro. Keep in step with `.intro` in
// components/home/home.module.css (the static logo hides at ZOOM_AT).
const DRAW_FROM = 0.65; // draw the first frame a little early, over the identical static logo
const ZOOM_AT = 0.8;
const ZOOM_FOR = 1.2;

const clamp = (v) => Math.min(1, Math.max(0, v));

self.onmessage = ({ data }) => {
    const { canvas, letters, t, w, h, dpr, start } = data;
    const ctx = canvas.getContext('2d');
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const letterPath = new Path2D(letters);
    const tPath = new Path2D(t);
    const cover = new Path2D(`M-40000 -40000H${LOGO_W + 40000}V${LOGO_H + 40000}H-40000Z${letters}${t}`);

    // Same layout as `.introLogo`: 72vw on phones, else min(300px, 50vw), centred.
    const logoW = w < 560 ? w * 0.72 : Math.min(300, w * 0.5);
    const k = logoW / LOGO_W;
    const ax = (w - logoW) / 2 + FOCUS.x * k;
    const ay = (h - LOGO_H * k) / 2 + FOCUS.y * k;
    // Scale at which the solid area around the focus reaches the farthest corner.
    const far = Math.max(Math.hypot(ax, ay), Math.hypot(w - ax, ay), Math.hypot(ax, h - ay), Math.hypot(w - ax, h - ay));
    const logMax = Math.log((far / (FOCUS.r * k)) * 1.04);

    const raf = self.requestAnimationFrame
        ? (fn) => self.requestAnimationFrame(fn)
        : (fn) => setTimeout(fn, 16);

    const frame = () => {
        const sec = (performance.timeOrigin + performance.now() - start) / 1000;
        if (sec < DRAW_FROM) return raf(frame);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const p = clamp((sec - ZOOM_AT) / ZOOM_FOR);
        if (p >= 1) return; // the hole now covers the screen: leave the canvas clear and stop

        // Zoom evenly in log space with a gentle ease-in, so the push-in is
        // visible from the first frame and speeds up towards the reveal.
        const u = Math.pow(p, 2.2);
        const s = Math.exp(logMax * u);
        ctx.setTransform(dpr * k * s, 0, 0, dpr * k * s, dpr * (ax - FOCUS.x * k * s), dpr * (ay - FOCUS.y * k * s));

        ctx.fillStyle = '#ffffff';
        ctx.fill(cover, 'evenodd');

        // Ink fades while the letters are still readable, turning them into windows.
        const ink = 1 - clamp((u - 0.04) / 0.26);
        if (ink > 0) {
            ctx.globalAlpha = ink;
            ctx.fillStyle = '#000000';
            ctx.fill(letterPath, 'evenodd');
            ctx.fillStyle = '#006FB9';
            ctx.fill(tPath);
            ctx.globalAlpha = 1;
        }
        raf(frame);
    };
    raf(frame);
};
