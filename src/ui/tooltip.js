// One shared tooltip for every element with data-tip (HTML allowed; it's always built by us).
import { dom } from './dom.js';

let tipEl = null;
// Touch: press and hold anything with a tooltip (a card, a keyword, an intent) to read it.
const HOLD_MS = 450;
let holdTimer = 0;
let held = false;

export function hideTip() {
  dom.tip.classList.remove('show');
  tipEl = null;
}

function position(el) {
  const r = el.getBoundingClientRect();
  const tw = dom.tip.offsetWidth;
  const th = dom.tip.offsetHeight;
  let x;
  let y;
  const side = el.closest('.hand') ? 'top' : el.getAttribute('data-tip-side');
  if (side === 'top') {
    x = r.left + r.width / 2 - tw / 2;
    y = r.top - th - 12;
  } else if (side === 'right') {
    x = r.right + 10;
    if (x + tw > window.innerWidth - 8) x = r.left - tw - 10;
    y = r.top;
  } else {
    x = r.left + r.width / 2 - tw / 2;
    y = r.bottom + 8;
    if (y + th > window.innerHeight - 8) y = r.top - th - 8;
  }
  x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - th - 8, y));
  dom.tip.style.left = `${x}px`;
  dom.tip.style.top = `${y}px`;
}

function showTip(el) {
  tipEl = el;
  dom.tip.innerHTML = el.getAttribute('data-tip');
  dom.tip.classList.add('show');
  position(el);
}

export function initTooltips() {
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el === tipEl) return;
    if (!el) {
      hideTip();
      return;
    }
    showTip(el);
  });

  // A hold shows the tip and swallows the tap, so holding a card reads it instead of playing it.
  document.addEventListener(
    'touchstart',
    (e) => {
      clearTimeout(holdTimer);
      held = false;
      const el = e.target.closest('[data-tip]');
      if (!el) {
        hideTip();
        return;
      }
      holdTimer = setTimeout(() => {
        held = true;
        showTip(el);
      }, HOLD_MS);
    },
    { passive: true },
  );
  const cancel = () => clearTimeout(holdTimer);
  document.addEventListener('touchmove', cancel, { passive: true });
  document.addEventListener('touchcancel', cancel, { passive: true });
  document.addEventListener(
    'touchend',
    (e) => {
      cancel();
      if (held && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  // Belt and braces for browsers that still send the click, and no long-press menu on a hold.
  document.addEventListener(
    'click',
    (e) => {
      if (!held) return;
      held = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
  document.addEventListener('contextmenu', (e) => {
    if (held) e.preventDefault();
  });
}
