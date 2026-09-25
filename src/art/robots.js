// The model mascots: small robots, front- or back-facing, drawn with canvas paths.
import { CHARACTERS } from '../game/data/characters.js';
import { crisp, makeCanvas, memo, roundRect, shade } from './canvas.js';

// Emblem shapes for each model.
export function emblem(ctx, id, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (id === 'claude') {
    ctx.lineWidth = Math.max(1, r * 0.34);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.25);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
  } else if (id === 'gpt') {
    ctx.lineWidth = Math.max(1, r * 0.36);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const b = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const px = cx + Math.cos(b) * r * 0.85;
      const py = cy + Math.sin(b) * r * 0.85;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (id === 'llama') {
    // A fork: one stem splitting into two branches.
    ctx.lineWidth = Math.max(1, r * 0.34);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - r * 0.75, cy - r * 0.8);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.75, cy - r * 0.8);
    ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (id === 'deepseek') {
    // Two arrows passing each other: the switch between experts.
    const w = r * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - w * 1.6);
    ctx.lineTo(cx + r * 0.2, cy - w * 1.6);
    ctx.lineTo(cx + r * 0.2, cy - w * 2.6);
    ctx.lineTo(cx + r, cy - w);
    ctx.lineTo(cx - r, cy - w);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r, cy + w * 1.6);
    ctx.lineTo(cx - r * 0.2, cy + w * 1.6);
    ctx.lineTo(cx - r * 0.2, cy + w * 2.6);
    ctx.lineTo(cx - r, cy + w);
    ctx.lineTo(cx + r, cy + w);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.fill();
  }
}

export function robot(charId, facing) {
  return memo(`r:${charId}:${facing}`, () => drawRobot(charId, facing));
}

export function robotURL(charId, facing) {
  return memo(`ru:${charId}:${facing}`, () => robot(charId, facing).toDataURL());
}

function drawRobot(charId, facing) {
  const col = CHARACTERS[charId].color;
  const c = makeCanvas(34, 44);
  const ctx = c.getContext('2d');
  const front = facing !== 'back';
  const dark = shade(col, -0.45);
  const light = shade(col, 0.35);
  const metal = '#8d93a8';
  const metalD = '#555a70';

  // legs + feet
  ctx.fillStyle = metalD;
  ctx.fillRect(11, 34, 4, 7);
  ctx.fillRect(19, 34, 4, 7);
  ctx.fillStyle = '#34384a';
  ctx.fillRect(9, 40, 7, 3);
  ctx.fillRect(18, 40, 7, 3);
  // arms
  ctx.fillStyle = dark;
  roundRect(ctx, 4, 22, 5, 12, 2);
  ctx.fill();
  roundRect(ctx, 25, 22, 5, 12, 2);
  ctx.fill();
  ctx.fillStyle = metal;
  ctx.fillRect(4, 32, 5, 3);
  ctx.fillRect(25, 32, 5, 3);
  // torso
  ctx.fillStyle = col;
  roundRect(ctx, 8, 21, 18, 15, 4);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.fillRect(9, 31, 16, 4);
  if (front) {
    ctx.fillStyle = '#f4efe2';
    roundRect(ctx, 12, 24, 10, 7, 2);
    ctx.fill();
    emblem(ctx, charId, 17, 27.5, 3.2, col);
  } else {
    ctx.fillStyle = metalD;
    roundRect(ctx, 11, 23, 12, 9, 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.fillRect(13, 25, 8, 1);
    ctx.fillRect(13, 28, 8, 1);
  }

  // head
  const hx = 17;
  const hy = 12;
  if (charId === 'claude') {
    emblem(ctx, 'claude', hx, hy, 11.5, light);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (charId === 'gpt') {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const px = hx + Math.cos(a) * 10;
      const py = hy + Math.sin(a) * 9;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(hx - 1, 1, 2, 3);
  } else if (charId === 'llama') {
    // Llama ears, then a rounded head.
    ctx.fillStyle = light;
    roundRect(ctx, hx - 8, 0, 4, 8, 2);
    ctx.fill();
    roundRect(ctx, hx + 4, 0, 4, 8, 2);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, hx - 9, hy - 7, 18, 15, 5);
    ctx.fill();
  } else if (charId === 'deepseek') {
    // A wide whale-like head with a tail fin on top.
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(hx, 4);
    ctx.lineTo(hx - 5, 0);
    ctx.lineTo(hx - 3, 5);
    ctx.lineTo(hx + 3, 5);
    ctx.lineTo(hx + 5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 10.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    emblem(ctx, 'gemini', hx, hy, 12, light);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(hx, hy, 7.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (front) {
    ctx.fillStyle = '#1b1830';
    roundRect(ctx, hx - 6, hy - 3, 12, 6, 2.5);
    ctx.fill();
    ctx.fillStyle = '#e9fbff';
    ctx.fillRect(hx - 4, hy - 1, 2, 3);
    ctx.fillRect(hx + 2, hy - 1, 2, 3);
  } else {
    emblem(ctx, charId, hx, hy, 4, dark);
  }
  // antenna
  ctx.fillStyle = metal;
  if (charId === 'claude' || charId === 'gemini') ctx.fillRect(hx - 0.5, 0, 1.5, 3);

  return crisp(c, { levels: 8 });
}
