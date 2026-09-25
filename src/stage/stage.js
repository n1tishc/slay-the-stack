// The top screen: one persistent three.js renderer drawing low-res 2.5D scenes
// (3D low-poly world + 2D pixel billboards), plus an HTML overlay anchored to 3D positions.
import * as THREE from 'three';
import { settings } from '../settings.js';
import { initRetro, renderRetro, resizeRetro } from './retro.js';

// Scenes read and move the shared camera directly.
export let camera = null;

let renderer;
let host;
let canvas;
let ovWorld;
let ovFloat;
let raycaster;
let cur = null;
let tweens = [];
let shakeAmp = 0;
let hitstop = 0;
let last = 0;
let hovered = null;
let frames = 0;
let pixelScale = 2;
let ready = false;
const pointer = { x: 0, y: 0, inside: false };
const tmpV = new THREE.Vector3();

// ───────── setup ─────────
export function initStage(hostEl) {
  host = hostEl;
  canvas = host.querySelector('canvas');
  ovWorld = host.querySelector('#ov-world');
  ovFloat = host.querySelector('#ov-float');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  initRetro();
  camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 120);
  raycaster = new THREE.Raycaster();
  window.addEventListener('resize', resize);
  bindPointer();
  resize();
  requestAnimationFrame(loop);
  ready = true;
}

function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function bindPointer() {
  canvas.addEventListener('pointermove', (e) => {
    setPointer(e);
    pointer.inside = true;
    if (cur?.drag && e.buttons === 1) cur.drag(e.movementX, e.movementY);
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });
  // A drag (e.g. looking ahead on the map) must never commit a click.
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('click', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    setPointer(e);
    const hit = pick();
    if (hit && cur?.click) cur.click(hit);
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!cur?.wheel) return;
      e.preventDefault();
      cur.wheel(e.deltaY);
    },
    { passive: false },
  );
}

export function resize() {
  if (!host) return;
  const w = Math.max(1, host.clientWidth);
  const h = Math.max(1, host.clientHeight);
  const targetH = settings.pixel === 'crisp' ? 320 : 190;
  pixelScale = Math.max(1, Math.round(h / targetH));
  renderer.setSize(Math.ceil(w / pixelScale), Math.ceil(h / pixelScale), false);
  resizeRetro(Math.ceil(w / pixelScale), Math.ceil(h / pixelScale));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function isReady() {
  return ready;
}

// ───────── main loop ─────────
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (hitstop > 0) {
    hitstop -= dt * 1000;
    dt = 0;
  }
  const sdt = dt * settings.speed;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += sdt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease ? tw.ease(k) : k);
    if (k >= 1) {
      tweens.splice(i, 1);
      tw.done();
    }
  }
  if (!cur) return;
  cur.time = (cur.time || 0) + sdt;
  cur.update(sdt, cur.time);
  // Cylindrical billboards: sprites turn to face the camera around Y only.
  for (const o of cur.billboards) {
    const wp = o.getWorldPosition(tmpV);
    o.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z) - (o.parent ? o.parent.rotation.y : 0);
  }
  if (shakeAmp > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shakeAmp;
    camera.position.y += (Math.random() - 0.5) * shakeAmp;
    shakeAmp *= Math.pow(0.0005, dt);
  }
  updateHover();
  if (settings.retro) renderRetro(renderer, cur.scene, camera);
  else renderer.render(cur.scene, camera);
  positionAnchors();
  frames++;
}

// ───────── tweens & game feel ─────────
export const ease = {
  linear: null,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  outBack: (k) => {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  },
};

// Animate fn(k) for k in 0..1 over `dur` seconds (scaled by game speed). Resolves when done.
export function tween(dur, fn, easing = ease.outCubic) {
  return new Promise((resolve) => {
    if (dur <= 0) {
      fn(1);
      resolve();
      return;
    }
    tweens.push({ t: 0, dur, fn, ease: easing, done: resolve });
  });
}

export function shake(amp) {
  if (!settings.shake || settings.reducedMotion) return;
  shakeAmp = Math.max(shakeAmp, amp);
}

export function hitStop(ms) {
  if (settings.reducedMotion) return;
  hitstop = Math.max(hitstop, ms);
}

export function flash(color = '#fff') {
  if (settings.reducedMotion) return;
  const d = document.createElement('div');
  d.className = 'screen-flash';
  d.style.background = color;
  ovFloat.appendChild(d);
  setTimeout(() => d.remove(), 450);
}

export function glitch() {
  if (settings.reducedMotion) return;
  host.classList.remove('glitch');
  void host.offsetWidth;
  host.classList.add('glitch');
  setTimeout(() => host.classList.remove('glitch'), 700);
}

// ───────── overlay anchoring ─────────
export function project(obj, yOff = 0) {
  obj.getWorldPosition(tmpV);
  tmpV.y += yOff;
  tmpV.project(camera);
  return { x: ((tmpV.x + 1) / 2) * host.clientWidth, y: ((1 - tmpV.y) / 2) * host.clientHeight, vis: tmpV.z < 1 };
}

// Overlays move in whole top-screen pixels so labels step in lockstep with the scene.
function snapX(x) {
  const px = host.clientWidth / renderer.domElement.width;
  return Math.round(Math.round(x / px) * px);
}
function snapY(y) {
  const px = host.clientHeight / renderer.domElement.height;
  return Math.round(Math.round(y / px) * px);
}

function anchorPos(key) {
  const a = cur?.anchors[key];
  return a ? project(a.obj, a.y) : null;
}

// Viewport position of an anchored object's centre, for tests and tooling.
export function screenPos(key) {
  const a = cur?.anchors[key];
  if (!a) return null;
  const p = project(a.obj, a.y * 0.5);
  const r = host.getBoundingClientRect();
  return { x: r.left + host.clientLeft + p.x, y: r.top + host.clientTop + p.y };
}

function positionAnchors() {
  for (const el of ovWorld.children) {
    const p = anchorPos(el.getAttribute('data-anchor'));
    // Hidden once the anchor itself is off-screen, so off-screen labels don't pile up at an edge.
    if (!p || !p.vis || p.x < 0 || p.x > host.clientWidth) {
      el.style.visibility = 'hidden';
      continue;
    }
    el.style.visibility = '';
    // Keep labels on screen: a tall boss's plate would otherwise poke out of the top.
    const w = el.offsetWidth;
    const x = Math.max(w / 2 + 4, Math.min(host.clientWidth - w / 2 - 4, p.x));
    const y = Math.max(el.offsetHeight + 4, p.y);
    el.style.transform = `translate(${snapX(x)}px,${snapY(y)}px) translate(-50%,-100%)`;
  }
}

// HTML elements with data-anchor="key" follow that scene anchor every frame.
export function setWorldHTML(html) {
  ovWorld.innerHTML = html;
  positionAnchors();
}

// A floating number/label rising from an anchor.
export function float(key, text, cls = '', delay = 0) {
  setTimeout(() => {
    const p = anchorPos(key);
    if (!p) return;
    const d = document.createElement('div');
    d.className = `float ${cls}`;
    d.textContent = text;
    d.style.left = `${snapX(p.x + (Math.random() * 24 - 12))}px`;
    d.style.top = `${snapY(p.y)}px`;
    ovFloat.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }, delay / settings.speed);
}

// ───────── picking ─────────
function pick() {
  if (!cur?.pickables.length) return null;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cur.pickables, false);
  const hit = hits.find((h) => h.object.userData.pick);
  return hit ? hit.object.userData.pick : null;
}

function updateHover() {
  if (!cur?.hover) return;
  const h = pointer.inside ? pick() : null;
  const key = h ? JSON.stringify(h) : null;
  if (key === hovered) return;
  hovered = key;
  cur.hover(h);
  canvas.style.cursor = h && (!cur.pointerOk || cur.pointerOk()) ? 'pointer' : '';
}

// Force the next frame to re-evaluate hover (e.g. when targeting turns on).
export function resetHover() {
  hovered = null;
}

// ───────── scene management ─────────
// builder(opts) returns a scene record: { scene, billboards, pickables, anchors, update(dt, t), ... }.
export function showScene(builder, opts = {}) {
  if (cur) disposeScene(cur);
  // Settle in-flight tweens so nothing awaiting them hangs.
  tweens.splice(0).forEach((tw) => tw.done());
  shakeAmp = 0;
  hovered = null;
  ovWorld.innerHTML = '';
  ovFloat.innerHTML = '';
  cur = builder(opts);
  cur.name = builder.sceneName;
  cur.update(0, 0);
  return cur;
}

export function currentScene() {
  return cur;
}

export function stageInfo() {
  return { calls: renderer.info.render.calls, programs: renderer.info.programs?.length, scene: cur?.name, pixel: pixelScale, frames };
}

export function floatLayer() {
  return ovFloat;
}

function disposeScene(sc) {
  sc.scene.traverse((o) => {
    o.geometry?.dispose();
    if (!o.material) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m) => {
      if (!m.userData.shared) m.dispose();
    });
  });
  sc.dispose?.();
}
