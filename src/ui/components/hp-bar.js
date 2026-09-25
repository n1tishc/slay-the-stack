// HP bar: green → yellow → red as it drains; Guard shown as a shield badge.
// Keyed bars remember their last value and drain smoothly (with a lagging "damage" chunk),
// the way handheld battle HP bars do, even though the markup is rebuilt on every action.
import { iconImg } from '../../art/icons.js';
import { KEYWORDS } from '../../game/core/glossary.js';
import { attr } from '../../lib/html.js';

const last = new Map(); // key → pct shown last time

const band = (pct) => (pct > 50 ? 'hi' : pct > 20 ? 'mid' : 'lo');

export function hpBar(hp, max, block, showNums, key) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const from = key && last.has(key) ? last.get(key) : pct;
  if (key) last.set(key, pct);
  const moving = from !== pct;
  const badge =
    block > 0
      ? `<div class="block-badge" data-tip="${attr(`<b>Guard</b><br>${KEYWORDS.Guard}`)}">${iconImg('🛡️', 'bb-ico', 16)}${block}</div>`
      : '';
  const data = moving ? ` data-from="${from}" data-to="${pct}"` : '';
  return (
    `<div class="hp-row">${badge}<span class="hp-lbl">HP</span><div class="bar"${data}>` +
    `<div class="lag" style="width:${Math.max(from, pct)}%"></div>` +
    `<div class="fill ${band(moving ? from : pct)}" style="width:${from}%"></div></div></div>` +
    (showNums ? `<div class="hp-nums">${Math.max(0, hp)} / ${max}</div>` : '')
  );
}

// Called after the markup is in the DOM: start the drain/fill transitions.
export function animateBars() {
  const bars = document.querySelectorAll('.bar[data-to]');
  if (!bars.length) return;
  requestAnimationFrame(() => {
    bars.forEach((bar) => {
      const to = +bar.dataset.to;
      const fill = bar.querySelector('.fill');
      fill.className = `fill ${band(to)}`;
      fill.style.width = `${to}%`;
      bar.querySelector('.lag').style.width = `${to}%`;
      bar.removeAttribute('data-to');
    });
  });
}

// Forget remembered values (e.g. between combats, when uids can repeat meaningfully).
export function resetBars() {
  last.clear();
}
