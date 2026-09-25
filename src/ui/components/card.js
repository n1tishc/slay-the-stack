// Card rendering. In combat, numbers include live modifiers (Weights, Deep Context, Exposed...).
import { iconImg } from '../../art/icons.js';
import { KEYWORDS } from '../../game/core/glossary.js';
import { CARDS, cardView } from '../../game/data/cards/index.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { countersOf } from '../../game/data/enemies/index.js';
import { attr, esc } from '../../lib/html.js';
import { highlight, keywordsIn } from './keywords.js';

const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', power: 'Power', status: 'Status', curse: 'Curse' };

function num(v, base) {
  const cls = v > base ? ' class="up"' : v < base ? ' class="down"' : '';
  return `<b${cls}>${v}</b>`;
}

// Formatting context passed to a card's desc(v, fx).
export function cardFx(c, view) {
  const live = !!c;
  const ctxAfter = live ? c.p.context + c.tokensFor(view) : 0;
  const alive = live ? c.enemiesAlive() : [];
  const tgt = alive.length === 1 && view.target === 'enemy' ? alive[0] : null;
  return {
    live,
    d: (n) => (live ? num(c.playerAttackDamage(n, tgt, ctxAfter), n) : `<b>${n}</b>`),
    b: (n) => (live ? num(c.guardAmount(n), n) : `<b>${n}</b>`),
    status: (s) => (live ? c.ps(s) : 0),
    block: () => (live ? c.p.block : 0),
    contextAfter: () => ctxAfter,
    cardsPlayed: () => (live ? c.cardsPlayedTurn : 0),
    lastPlayed: () => (live && c.lastPlayed ? CARDS[c.lastPlayed.id].name + (c.lastPlayed.up ? '+' : '') : ''),
    forks: () => (live ? c.forksPlayed : 0),
    forksInHand: () => (live ? c.forksInHand() - (view.fork ? 1 : 0) : 0),
    otherCards: () => (live ? c.hand.length - 1 : 0),
    switches: () => (live ? c.switchesTurn + (c.wouldSwitch(view) ? 1 : 0) : 0),
    paren: (s) => (live ? ` (${s})` : ''),
    isFork: () => !!view.fork,
  };
}

function cardTip(view, descText) {
  const keys = keywordsIn(descText);
  if (view.fork && !keys.includes('Fork')) keys.unshift('Fork');
  if (view.exhaust && !keys.includes('Exhaust')) keys.push('Exhaust');
  const parts = [`<div class="tt-sec"><b>${esc(view.name)}</b> · ${view.cost} Compute · ${view.tok} tokens</div>`];
  keys.forEach((k) => parts.push(`<div class="tt-sec"><b>${k}</b><br>${KEYWORDS[k]}</div>`));
  const counters = countersOf(view.id);
  if (counters.length) {
    const names = counters.map((d) => `<b>${esc(d.name)}</b>`).join(' and ');
    parts.push(`<div class="tt-sec"><b>Counters</b> ${names}<br>${KEYWORDS.Counter}</div>`);
  }
  return parts.join('');
}

// opts: { c, playable, selected, hotkey, cls, act, data, style, counter }
export function renderCard(inst, opts = {}) {
  const view = cardView(inst);
  const c = opts.c || null;
  const desc = view.def.desc(view.v, cardFx(c, view));
  const tokNow = c ? c.tokensFor(view) : view.tok;
  let tokCls = '';
  if (c && c.p.context + tokNow > c.p.maxContext && !view.unplayable) tokCls = ' over';
  else if (c && tokNow < view.tok) tokCls = ' free';
  const cls = ['card', view.type, `r-${view.rarity}`];
  if (view.up) cls.push('upgraded');
  if (view.encrypted) cls.push('encrypted');
  if (view.fork) cls.push('forked');
  // DeepSeek: flag the cards in hand that would be a Switch if played now.
  const sw = !!c && !view.unplayable && CHARACTERS[c.run.char]?.showSwitch && c.wouldSwitch(view);
  if (opts.counter) cls.push('counter-ready');
  if (opts.cls) cls.push(opts.cls);
  if (c) {
    if (!opts.playable) cls.push('unplayable');
    if (opts.selected) cls.push('selected');
    if (tokCls === ' over' && opts.playable) cls.push('overflow-risk');
  }
  let data = opts.act ? ` data-act="${opts.act}"` : '';
  for (const [k, v] of Object.entries(opts.data || {})) data += ` data-${k}="${attr(v)}"`;
  if (opts.style) data += ` style="${opts.style}"`;
  const stripped = desc.replace(/<[^>]+>/g, '');
  const tip = cardTip(view, stripped) + (view.encrypted ? `<div class="tt-sec"><b>Encrypted</b><br>${KEYWORDS.Encrypted}</div>` : '');
  return (
    `<div class="${cls.join(' ')}"${data} data-tip="${attr(tip)}" data-tip-side="right">` +
    `<div class="cost${view.encrypted ? ' up' : ''}">${view.unplayable ? '–' : view.cost}</div>` +
    `<div class="cname">${esc(view.name)}</div>` +
    `<div class="art">${iconImg(view.icon, 'art-ico', 24)}` +
    (view.unplayable ? '' : `<div class="tok${tokCls}">+${tokNow}t</div>`) +
    (opts.counter ? '<div class="counter-tag">COUNTER</div>' : sw ? '<div class="counter-tag switch-tag">SWITCH</div>' : '') +
    (view.fork ? '<div class="fork-tag">FORK</div>' : '') +
    (view.encrypted ? `<div class="lock">${iconImg('🔒', 'lock-ico', 16)}</div>` : '') +
    `<i class="gem"></i></div>` +
    `<div class="ctype">${TYPE_LABEL[view.type]}</div>` +
    `<div class="cdesc"><div>${highlight(desc)}</div></div>` +
    (opts.hotkey ? `<div class="hk">${opts.hotkey}</div>` : '') +
    '</div>'
  );
}
