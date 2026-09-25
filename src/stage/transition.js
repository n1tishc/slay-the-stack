// Encounter transitions in the style of handheld RPG battle intros: the screen flashes,
// then a pixel pattern wipes it to black; the battle is revealed by the same pattern in reverse.
// Technique: every pixel of a tiny canvas gets a threshold in 0..1 from a pattern; a pixel is
// covered while its threshold is below the animation progress.
import { settings } from '../settings.js';

const W = 96;
const H = 54;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

let canvas = null;
let generation = 0; // bumped by clearTransition() to abandon a wipe in progress
let ctx = null;
let img = null;
const patterns = {};

// Pattern per encounter kind, precomputed once.
function pattern(kind) {
  if (patterns[kind]) return patterns[kind];
  const p = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      const r = Math.min(1, Math.hypot(dx, dy * 0.75) / 1.25);
      const dither = (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.08;
      let v;
      if (kind === 'elite') {
        // Swirl: an angular sweep that tightens toward the centre.
        const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
        v = ((a + (1 - r) * 0.6) % 1) * 0.7 + (1 - r) * 0.3;
      } else if (kind === 'boss') {
        // Iris closing from the edges, broken up by dithering.
        v = 1 - r + dither * 3;
      } else {
        // Horizontal blinds sliding in from alternating sides.
        const band = Math.floor(y / 6);
        const u = x / (W - 1);
        v = (band % 2 ? u : 1 - u) * 0.85 + (band / (H / 6)) * 0.15;
      }
      p[y * W + x] = Math.max(0, Math.min(1, v + dither));
    }
  }
  return (patterns[kind] = p);
}

export function initTransition(host) {
  canvas = document.createElement('canvas');
  canvas.id = 'wipe';
  canvas.width = W;
  canvas.height = H;
  canvas.hidden = true;
  host.appendChild(canvas);
  ctx = canvas.getContext('2d');
  img = ctx.createImageData(W, H);
}

function draw(p, k, covering, color) {
  const d = img.data;
  for (let i = 0; i < p.length; i++) {
    const on = covering ? p[i] < k : p[i] >= k;
    d[i * 4] = color[0];
    d[i * 4 + 1] = color[1];
    d[i * 4 + 2] = color[2];
    d[i * 4 + 3] = on ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
}

function run(kind, covering, seconds) {
  const p = pattern(kind);
  const color = kind === 'boss' ? [26, 4, 10] : [10, 8, 18];
  canvas.hidden = false;
  const gen = generation;
  return new Promise((resolve) => {
    const start = performance.now();
    const dur = (seconds * 1000) / settings.speed;
    const step = (now) => {
      if (gen !== generation) return resolve();
      const k = Math.min(1, (now - start) / dur);
      draw(p, k * 1.02, covering, color);
      if (k < 1) requestAnimationFrame(step);
      else {
        if (!covering) canvas.hidden = true;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function flashes(count, color) {
  return new Promise((resolve) => {
    let n = 0;
    const gen = generation;
    canvas.hidden = false;
    const tick = () => {
      if (gen !== generation) return resolve();
      const on = n % 2 === 0;
      ctx.fillStyle = color;
      ctx.clearRect(0, 0, W, H);
      if (on) ctx.fillRect(0, 0, W, H);
      n++;
      if (n < count * 2) setTimeout(tick, 70 / settings.speed);
      else resolve();
    };
    tick();
  });
}

// Cover the top screen before the battle scene is built.
export async function battleTransition(kind) {
  if (!canvas || settings.reducedMotion) return;
  const gen = generation;
  await flashes(kind === 'boss' ? 3 : 2, kind === 'boss' ? '#ff3348' : '#ffffff');
  if (gen !== generation) return;
  await run(kind, true, kind === 'normal' ? 0.45 : 0.6);
}

// Reveal the freshly built battle scene.
export function revealTransition(kind) {
  if (!canvas || canvas.hidden) return Promise.resolve();
  return run(kind, false, 0.4);
}

// Drop any wipe in progress (e.g. the player quit to the title mid-transition).
export function clearTransition() {
  generation++;
  if (canvas) canvas.hidden = true;
}
