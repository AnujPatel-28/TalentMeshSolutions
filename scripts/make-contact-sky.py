"""Render the halftone-dot cloud sky behind the contact page header.

Usage: python3 scripts/make-contact-sky.py public/images/contact

Clouds are built from overlapping soft puffs (domed tops, flatter bases), broken up with
fractal noise, then drawn as a grid of dots whose size follows the cloud density. Dots on
the underside of a cloud are shaded a little greyer, like the reference.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw


def smooth_noise(w, h, cells_x, cells_y, rng):
    grid = rng.random((cells_y + 3, cells_x + 3)).astype(np.float32)
    img = Image.fromarray((grid * 255).astype(np.uint8), 'L')
    big = img.resize((int(w * (cells_x + 3) / cells_x), int(h * (cells_y + 3) / cells_y)), Image.BICUBIC)
    a = np.asarray(big, dtype=np.float32) / 255
    oy, ox = (a.shape[0] - h) // 2, (a.shape[1] - w) // 2
    return a[oy:oy + h, ox:ox + w]


def fractal(w, h, base, rng, octaves=4):
    n, amp, total = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(octaves):
        n += amp * smooth_noise(w, h, base * 2 ** o, max(1, int(base * 2 ** o * h / w)), rng)
        total += amp
        amp *= 0.5
    n /= total
    return (n - n.min()) / (n.max() - n.min())


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def render(out, W, H, pitch, seed, clouds, clear):
    rng = np.random.default_rng(seed)
    gw, gh = W // pitch + 2, H // pitch + 2
    ys, xs = np.mgrid[0:gh, 0:gw].astype(np.float32)

    field = np.zeros((gh, gw), np.float32)
    # Warp the sampling grid so cloud edges come out ragged rather than round.
    wx = (fractal(gw, gh, 6, rng) - 0.5) * 7
    wy = (fractal(gw, gh, 6, rng) - 0.5) * 4
    xs_w, ys_w = xs + wx, ys + wy
    for cx, cy, cw, ch in clouds:
        # Cloud centre/size in grid cells.
        X, Y, CW, CH = cx * gw, cy * gh, cw * gw, ch * gh
        body = np.zeros_like(field)
        for _ in range(int(14 + cw * 40)):
            t = rng.random() - 0.5
            px = X + t * CW
            r = CH * (0.35 + 0.55 * rng.random()) * (1 - abs(t) * 1.1)
            py = Y - r * (0.2 + 0.6 * rng.random())
            d2 = ((xs_w - px) ** 2 + ((ys_w - py) * 1.15) ** 2) / (r * r + 1e-6)
            body = np.maximum(body, np.exp(-d2 * 1.3))
        # Flatten the base: fade out below the baseline.
        body *= 1 - smoothstep(Y + CH * 0.0, Y + CH * 0.5, ys_w)
        field = np.maximum(field, body)

    noise = fractal(gw, gh, 4, rng)
    fine = fractal(gw, gh, 12, rng, 3)
    n = field * (0.3 + 1.1 * noise) * (0.65 + 0.7 * fine)
    cloud = smoothstep(0.16, 0.95, n)
    # Haze and stray dots around and between clouds.
    halo = smoothstep(0.02, 0.3, field) * smoothstep(0.42, 0.85, fine) * 0.55
    stray = smoothstep(0.80, 0.97, fractal(gw, gh, 30, rng, 2)) * 0.3
    dens = np.maximum(cloud, np.maximum(halo, stray))
    u, v = xs / gw, ys / gh
    # Keep the navigation bar clear, and keep stray dots out of the heading.
    dens *= smoothstep(0.07, 0.15, v)
    x0, y0, x1, y1 = clear
    inside = smoothstep(x0 - .05, x0 + .05, u) * (1 - smoothstep(x1 - .05, x1 + .05, u)) * smoothstep(y0 - .05, y0 + .05, v) * (1 - smoothstep(y1 - .05, y1 + .05, v))
    dens = np.where(cloud > 0.3, dens, dens * (1 - inside))

    # Underside shading: more cloud above this dot than at it -> greyer.
    above = np.zeros_like(cloud)
    for k in (1, 2, 3):
        above = np.maximum(above, np.roll(cloud, k, axis=0))
    shade = np.clip((above - cloud) * 1.6 + (1 - smoothstep(0.0, 0.6, cloud)) * 0.0, 0, 1)
    # Inner shading: lower half of each cloud slightly greyer than the domed top.
    below = np.roll(cloud, -3, axis=0)
    inner = np.clip(cloud - below, 0, 1) * 0 + np.clip(below - np.roll(cloud, 4, axis=0), 0, 1)

    S = 2
    top, bot = np.array([5, 84, 176]), np.array([78, 152, 218])
    grad = np.linspace(0, 1, H * S)[:, None] * (bot - top) + top
    img = Image.fromarray(np.repeat(grad[:, None, :], W * S, axis=1).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(img, 'RGBA')
    rmax = pitch * 0.6
    for j in range(gh):
        for i in range(gw):
            val = dens[j, i]
            if val < 0.05:
                continue
            r = rmax * np.sqrt(val) * S
            x, y = (i - 0.5) * pitch * S, (j - 0.5) * pitch * S
            g = min(1.0, shade[j, i] * 0.8 + inner[j, i] * 0.6)
            col = (int(255 - 52 * g), int(255 - 38 * g), int(255 - 18 * g))
            alpha = int(255 * (0.45 + 0.55 * min(1.0, val * 1.3)))
            d.ellipse([x - r, y - r, x + r, y + r], fill=col + (alpha,))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(out, 'WEBP', quality=78, method=6)


if __name__ == '__main__':
    outdir = sys.argv[1]
    # (centre x, baseline y, width, height) as fractions of the image.
    render(f'{outdir}/contact-sky.webp', 2400, 1000, 24, 5, [
        (0.13, 0.50, 0.30, 0.30), (0.86, 0.44, 0.32, 0.30),
        (0.30, 0.95, 0.34, 0.22), (0.74, 0.97, 0.40, 0.22), (0.98, 0.80, 0.14, 0.14),
        (0.02, 0.92, 0.14, 0.14),
    ], (0.28, 0.0, 0.72, 0.5))
    render(f'{outdir}/contact-sky-mobile.webp', 900, 1200, 22, 9, [
        (1.0, 0.27, 0.36, 0.08), (0.10, 0.64, 0.50, 0.14), (0.88, 0.72, 0.45, 0.13),
        (0.45, 0.97, 0.80, 0.14),
    ], (0.0, 0.0, 0.85, 0.56))
