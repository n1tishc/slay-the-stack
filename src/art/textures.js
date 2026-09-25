// Tiling and scenery textures for the top screen.
import { makeCanvas, memo, seeded, shade } from './canvas.js';

// Circuit-board ground for the overworld and title.
export function pcb() {
  return memo('pcb', () => {
    const S = 64;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const rnd = seeded(7);
    ctx.fillStyle = '#1f5c3f';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#236847' : '#1b5238';
      ctx.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 1, 1);
    }
    ctx.fillStyle = '#2f7a55';
    for (let i = 0; i < 6; i++) {
      const y = (rnd() * S) | 0;
      const x = (rnd() * S) | 0;
      const len = 8 + ((rnd() * 20) | 0);
      ctx.fillRect(x, y, len, 1);
      ctx.fillRect(x + len, y, 1, 6 + ((rnd() * 8) | 0));
    }
    ctx.fillStyle = '#c9a34a';
    for (let i = 0; i < 5; i++) ctx.fillRect((rnd() * (S - 2)) | 0, (rnd() * (S - 2)) | 0, 2, 2);
    return c;
  });
}

export function floorTiles(tint = '#2a3150') {
  return memo(`floor:${tint}`, () => {
    const S = 32;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, S, S);
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const x = tx * 16;
        const y = ty * 16;
        ctx.fillStyle = shade(tint, 0.12);
        ctx.fillRect(x, y, 16, 1);
        ctx.fillRect(x, y, 1, 16);
        ctx.fillStyle = shade(tint, -0.35);
        ctx.fillRect(x, y + 15, 16, 1);
        ctx.fillRect(x + 15, y, 1, 16);
        ctx.fillStyle = shade(tint, -0.12);
        ctx.fillRect(x + 6, y + 6, 4, 4);
      }
    }
    return c;
  });
}

// Server rack face; LED pixels are redrawn on demand to blink.
export function rackCanvas(seed) {
  const c = makeCanvas(16, 40);
  drawRack(c, seed, 0);
  return c;
}

export function drawRack(c, seed, t) {
  const ctx = c.getContext('2d');
  const rnd = seeded(seed * 31 + (t | 0));
  ctx.fillStyle = '#15161f';
  ctx.fillRect(0, 0, 16, 40);
  for (let y = 1; y < 39; y += 4) {
    ctx.fillStyle = '#262a3a';
    ctx.fillRect(1, y, 14, 3);
    ctx.fillStyle = '#10121a';
    ctx.fillRect(1, y + 2, 14, 1);
    for (let k = 0; k < 3; k++) {
      const on = rnd();
      ctx.fillStyle = on < 0.45 ? '#59f07d' : on < 0.6 ? '#ffb347' : on < 0.66 ? '#ff4d5e' : '#1d2433';
      ctx.fillRect(10 + k * 2, y + 1, 1, 1);
    }
  }
}

// Vertical gradient with ordered dithering, for skies and backdrops.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function gradient(top, bottom, h = 96) {
  return memo(`g:${top}${bottom}${h}`, () => {
    const c = makeCanvas(4, h);
    const ctx = c.getContext('2d');
    const a = parseInt(top.slice(1), 16);
    const b = parseInt(bottom.slice(1), 16);
    const img = ctx.createImageData(4, h);
    const bands = 10;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < 4; x++) {
        let f = y / (h - 1) + (BAYER[(y % 4) * 4 + x] / 16 - 0.5) / 10;
        f = Math.round(Math.max(0, Math.min(1, f)) * bands) / bands;
        const i = (y * 4 + x) * 4;
        img.data[i] = ((a >> 16) & 255) * (1 - f) + ((b >> 16) & 255) * f;
        img.data[i + 1] = ((a >> 8) & 255) * (1 - f) + ((b >> 8) & 255) * f;
        img.data[i + 2] = (a & 255) * (1 - f) + (b & 255) * f;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
}

// Platform top: a tiled disc with a bright rim, like the classic battle bases.
export function platformTop(col) {
  return memo(`pt:${col}`, () => {
    const S = 48;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = shade(col, -0.25);
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = shade(col, -0.1);
    for (let y = 0; y < S; y += 6) {
      for (let x = (y / 6) % 2 ? 0 : 6; x < S; x += 12) ctx.fillRect(x, y, 6, 6);
    }
    ctx.strokeStyle = shade(col, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  });
}

// Dark stone with glowing red cracks, for the Legacy Monolith.
export function crackTexture() {
  return memo('crack', () => {
    const c = makeCanvas(32, 64);
    const ctx = c.getContext('2d');
    const rnd = seeded(99);
    ctx.fillStyle = '#12101a';
    ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = '#1c1928';
    for (let i = 0; i < 40; i++) ctx.fillRect((rnd() * 32) | 0, (rnd() * 64) | 0, 2, 1);
    ctx.fillStyle = '#ff3b4f';
    for (let k = 0; k < 5; k++) {
      let x = (rnd() * 28) | 0;
      let y = (rnd() * 60) | 0;
      for (let s = 0; s < 12; s++) {
        ctx.fillRect(x, y, 1, 2);
        x += rnd() < 0.5 ? -1 : 1;
        y += 2;
      }
    }
    ctx.fillStyle = '#ff9aa6';
    for (let i = 0; i < 12; i++) ctx.fillRect((rnd() * 32) | 0, (rnd() * 64) | 0, 1, 1);
    return c;
  });
}
