// Re-render the bottom screen and the top-screen overlays for the current screen.
// Each screen module exports bottom() and optionally hud(), world() and `strip`.
import { settings } from '../settings.js';
import { setWorldHTML } from '../stage/index.js';
import { animateBars } from './components/hp-bar.js';
import { statusStrip } from './components/status-strip.js';
import { dom } from './dom.js';
import * as charSelect from './screens/char-select.js';
import * as combat from './combat/view.js';
import * as event from './screens/event.js';
import * as gameOver from './screens/game-over.js';
import * as map from './screens/map.js';
import * as practice from './screens/practice.js';
import * as rest from './screens/rest.js';
import * as reward from './screens/reward.js';
import * as shop from './screens/shop.js';
import * as title from './screens/title.js';
import * as treasure from './screens/treasure.js';
import { ui } from './state.js';
import { hideTip } from './tooltip.js';

const SCREENS = { title, charselect: charSelect, map, combat, reward, rest, shop, event, treasure, over: gameOver, practice };

export function render() {
  hideTip();
  const s = SCREENS[ui.screen];
  const before = measureFlips();
  dom.app.className = `scr-${ui.screen}`;
  dom.app.innerHTML = (s.strip ? statusStrip() : '') + s.bottom();
  s.afterRender?.();
  playFlips(before);
  renderHUD();
}

// FLIP: the markup is rebuilt on every render, so elements tagged data-flip="key" (hand
// cards) would jump to their new layout. Measure them before, then animate from the old
// spot to the new one.
function measureFlips() {
  const out = new Map();
  if (settings.reducedMotion) return out;
  for (const el of dom.app.querySelectorAll('[data-flip]')) {
    out.set(el.dataset.flip, { box: el.getBoundingClientRect(), rotate: getComputedStyle(el).rotate });
  }
  return out;
}

function playFlips(before) {
  if (!before.size) return;
  for (const el of dom.app.querySelectorAll('[data-flip]')) {
    const was = before.get(el.dataset.flip);
    if (!was) continue;
    const box = el.getBoundingClientRect();
    const dx = was.box.left + was.box.width / 2 - (box.left + box.width / 2);
    const dy = was.box.top + was.box.height / 2 - (box.top + box.height / 2);
    const rotate = getComputedStyle(el).rotate;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && rotate === was.rotate) continue;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, rotate: was.rotate },
        { transform: 'none', rotate },
      ],
      { duration: 180 / settings.speed, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
    );
  }
}

// Top-screen HTML that sits over the 3D scene.
export function renderHUD() {
  const s = SCREENS[ui.screen];
  dom.hud.innerHTML = s.hud ? s.hud() : '';
  setWorldHTML(s.world ? s.world() : '');
  animateBars();
}
