// Field Guide: every failure mode you have met, what it looks like, why it happens and the fix.
// Entries unlock the first time you fight one; the rest stay hidden until then.
import { iconImg } from '../../art/icons.js';
import { CARDS } from '../../game/data/cards/index.js';
import { FAILURES } from '../../game/data/enemies/index.js';
import { esc } from '../../lib/html.js';
import { loadGuide } from '../../settings.js';
import { defineActions } from '../actions.js';
import { openModal } from '../modal.js';

const TIER = { 1: 'Beginner', 2: 'Agent workflow', 3: 'Security' };

function entry(def, seen, focus) {
  if (!seen) {
    return (
      '<div class="fg-entry locked">' +
      `<div class="fg-head"><span class="fg-ico">?</span><div><b>???</b><small>${TIER[def.tier]} · meet it in a run to unlock</small></div></div></div>`
    );
  }
  const card = CARDS[def.weakness];
  const l = def.lesson;
  return (
    `<div class="fg-entry${focus ? ' focus' : ''}" id="fg-${def.id}">` +
    `<div class="fg-head">${iconImg(def.icon, 'fg-ico', 32)}<div><b>${esc(def.name)}</b><small>${TIER[def.tier]} · “${esc(def.flavor)}”</small></div></div>` +
    `<dl><dt>What it looks like</dt><dd>${esc(l.sign)}</dd>` +
    `<dt>Why it happens</dt><dd>${esc(l.why)}</dd>` +
    `<dt>What to do</dt><dd>${esc(l.fix)}</dd>` +
    `<dt>Example</dt><dd>${esc(l.example)}</dd></dl>` +
    `<div class="fg-fact"><b>Did you know?</b> ${esc(l.fact)}</div>` +
    `<div class="fg-counter">Countered in game by ${iconImg(card.icon, '', 16)} <b>${esc(card.name)}</b></div>` +
    `<div class="fg-src">Sources: ${l.sources
      .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`)
      .join(' · ')}</div>` +
    '</div>'
  );
}

function body(focus) {
  const seen = loadGuide();
  const found = FAILURES.filter((def) => seen.includes(def.id)).length;
  return (
    '<button class="pill close-x" data-act="close-modal">✕</button>' +
    '<div class="howto field-guide"><h2>Field Guide</h2>' +
    `<p class="dim">${found} of ${FAILURES.length} failure modes discovered. These are common ways coding agents go wrong, and the habits that prevent them.</p>` +
    `<div class="fg-list">${FAILURES.map((def) => entry(def, seen.includes(def.id), def.id === focus)).join('')}</div>` +
    '<div class="modal-actions"><button class="ds-btn red" data-act="close-modal">CLOSE</button></div></div>'
  );
}

defineActions({
  'field-guide': (d) => {
    openModal(() => body(d.id));
    if (d.id) document.getElementById(`fg-${d.id}`)?.scrollIntoView({ block: 'center' });
  },
});
