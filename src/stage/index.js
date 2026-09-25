// Public surface of the top-screen renderer. This module stays free of three.js: the 3D side
// (./impl.js) is a separate chunk that starts loading at startup, so the bottom screen is usable
// before it arrives. Until then the latest scene request and world HTML are remembered and
// replayed on load, and effects are skipped.
import { initTransition } from './transition.js';

export { battleTransition, clearTransition, revealTransition } from './transition.js';

// Scene names, passed to showScene() in place of the builders that live in ./impl.js.
export const battle = 'battle';
export const charSelect = 'charSelect';
export const mapScene = 'mapScene';
export const room = 'room';
export const title = 'title';

let impl = null;
let loading = null;
let host = null;
let pending = null; // { name, opts, stub }
let worldHTML = null;

export function initStage(hostEl) {
  host = hostEl;
  host.classList.add('booting');
  initTransition(host);
  loadStage().catch(() => {});
}

// Resolves once the 3D side is running. Browsers remember a failed module download, so
// retrying the import cannot help: on failure (or if the renderer cannot start), offer a reload
// instead. The run is saved.
export function loadStage() {
  loading ??= import('./impl.js').then(boot).catch((err) => {
    offerReload();
    throw err;
  });
  return loading;
}

function offerReload() {
  host.classList.remove('booting');
  if (host.querySelector('.stage-reload')) return;
  const b = document.createElement('button');
  b.className = 'pill stage-reload';
  b.textContent = '3D view failed to load · RELOAD';
  b.onclick = () => location.reload();
  host.appendChild(b);
}

function boot(mod) {
  mod.initStage(host);
  impl = mod;
  host.classList.remove('booting');
  if (pending) {
    const real = mod.showScene(mod.scenes[pending.name], pending.opts);
    Object.assign(real, pending.target);
    pending.real = real;
    pending = null;
  }
  if (worldHTML !== null) mod.setWorldHTML(worldHTML);
}

// Before load this returns a stand-in: properties set on it (such as `click`) are copied onto
// the real scene, and afterwards every access goes straight through to the real scene.
export function showScene(name, opts = {}) {
  if (impl) return impl.showScene(impl.scenes[name], opts);
  worldHTML = null;
  const slot = { name, opts, target: {}, real: null };
  pending = slot;
  return new Proxy(slot.target, {
    get: (t, k) => {
      if (!slot.real) return t[k];
      const v = slot.real[k];
      return typeof v === 'function' ? v.bind(slot.real) : v;
    },
    set: (t, k, v) => {
      (slot.real || t)[k] = v;
      return true;
    },
  });
}

export function setWorldHTML(html) {
  if (impl) impl.setWorldHTML(html);
  else worldHTML = html;
}

export const isReady = () => !!impl;
export const currentScene = () => impl?.currentScene() ?? null;
export const stageInfo = () => impl?.stageInfo();
export const screenPos = (key) => impl?.screenPos(key);
export const floatLayer = () => host.querySelector('#ov-float');

export function resize() {
  impl?.resize();
}
export function float(...args) {
  impl?.float(...args);
}
export function flash(...args) {
  impl?.flash(...args);
}
export function glitch(...args) {
  impl?.glitch(...args);
}
export function shake(...args) {
  impl?.shake(...args);
}
