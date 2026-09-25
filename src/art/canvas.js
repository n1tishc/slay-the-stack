// Pixel-art pipeline: everything is drawn on small canvases, then snapped to hard pixels
// (alpha threshold + palette quantize + dark outline). No image files are shipped.
import { RNG } from '../game/core/rng.js';

const OUTLINE = [24, 18, 36];

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Snap a soft canvas to hard pixels, then add a 1px outline around the silhouette.
export function crisp(src, opts = {}) {
  const w = src.width;
  const h = src.height;
  const W = w + 2;
  const H = h + 2;
  const out = makeCanvas(W, H);
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  const octx = out.getContext('2d');
  const img = octx.createImageData(W, H);
  const o = img.data;
  const solid = new Uint8Array(W * H);
  const levels = opts.levels || 6;
  const step = 255 / (levels - 1);
  const alphaCut = opts.alpha || 110;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < alphaCut) continue;
      const j = (y + 1) * W + (x + 1);
      solid[j] = 1;
      // Un-premultiply partially transparent edge pixels so they don't go dark.
      const a = data[i + 3] / 255;
      for (let k = 0; k < 3; k++) {
        const v = Math.min(255, data[i + k] / Math.max(a, 0.5));
        o[j * 4 + k] = Math.round(Math.round(v / step) * step);
      }
      o[j * 4 + 3] = 255;
    }
  }
  if (opts.outline !== false) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (solid[p]) continue;
        const touches = (x > 0 && solid[p - 1]) || (x < W - 1 && solid[p + 1]) || (y > 0 && solid[p - W]) || (y < H - 1 && solid[p + W]);
        if (!touches) continue;
        o[p * 4] = OUTLINE[0];
        o[p * 4 + 1] = OUTLINE[1];
        o[p * 4 + 2] = OUTLINE[2];
        o[p * 4 + 3] = 255;
      }
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

// Lighten (f > 0) or darken (f < 0) a #rrggbb colour. Returns an rgb() string.
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Deterministic noise for textures, so scenery looks the same every time.
export function seeded(seed) {
  const r = new RNG(seed);
  return () => r.next();
}

// Memoise canvases/data URLs by key: every sprite and texture is drawn once.
const cache = new Map();
export function memo(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}
