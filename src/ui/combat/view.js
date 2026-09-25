// Combat screen markup: the hand, Context meter, Compute and piles on the bottom screen;
// the player box and enemy nameplates on the top screen.
import { iconImg } from '../../art/icons.js';
import { KEYWORDS } from '../../game/core/glossary.js';
import { CARDS, cardView } from '../../game/data/cards/index.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { attr, esc } from '../../lib/html.js';
import { renderCard } from '../components/card.js';
import { hpBar } from '../components/hp-bar.js';
import { intent } from '../components/intent.js';
import { highlight } from '../components/keywords.js';
import { statuses } from '../components/status.js';
import { isTargeting, ui } from '../state.js';

export const strip = true;

// Total damage enemies intend to deal next turn.
function incoming(c) {
  return c.enemiesAlive().reduce((sum, e) => {
    const i = c.intentInfo(e);
    return i && i.dmg !== undefined ? sum + i.dmg * i.hits : sum;
  }, 0);
}

export function hud() {
  const c = ui.c;
  if (!c) return '';
  const chr = CHARACTERS[ui.run.char];
  const inc = incoming(c);
  const through = Math.max(0, inc - c.p.block);
  const lethal = through >= c.p.hp;
  const incTip = '<b>Incoming damage</b><br>Total the enemies intend to deal next turn, minus your current Guard.';
  const floor = ui.run.pos && !ui.run.pos.boss ? ui.run.pos.row + 1 : 13;
  const incHtml =
    inc > 0
      ? `<div class="incoming${lethal ? ' lethal' : ''}" data-tip="${attr(incTip)}">${iconImg('⚔️', 'in-ico', 16)}INCOMING ${inc}` +
        (c.p.block ? ` − GUARD ${Math.min(c.p.block, inc)}` : '') +
        ` → <b>−${through} HP</b>${lethal ? ' ☠' : ''}</div>`
      : '<div class="incoming safe">No attacks incoming</div>';
  const ctxPct = Math.min(100, (c.p.context / c.p.maxContext) * 100);
  return (
    `<div class="hud-chip">TURN ${c.turn}${c.isDeep() ? ' · <span class="deep-tag">DEEP CONTEXT</span>' : ''}</div>` +
    `<div class="player-box${c.isDeep() ? ' deep' : ''}">` +
    `<div class="pb-top"><span class="pb-name">${chr.name}</span><span class="pb-lv">FL${floor}</span></div>` +
    hpBar(c.p.hp, c.p.maxHp, c.p.block, true, 'player') +
    `<div class="ctx-row"><span class="ctx-lbl">CTX</span><div class="ctx-mini"><div style="width:${ctxPct}%"></div></div></div>` +
    statuses(c.p.status) +
    incHtml +
    '</div>'
  );
}

// Per-enemy counter (deadlines, escape timers, the agent's own Context...).
function badge(c, e) {
  const b = e.def.badge?.(c, e);
  if (!b) return '';
  const bar = b.ctx !== undefined ? `<i class="bctx" style="width:${Math.min(100, b.ctx * 100)}%"></i>` : '';
  return `<div class="ebadge${b.warn ? ' warn' : ''}" data-tip="${attr(b.tip)}">${iconImg(b.icon, 'in-ico', 16)}<span>${esc(b.text)}</span>${bar}</div>`;
}

// Enemy nameplates, anchored above each sprite.
export function world() {
  const c = ui.c;
  if (!c) return '';
  const targeting = isTargeting();
  return c.enemies
    .filter((e) => e.alive || ui.dying[e.uid])
    .map((e) => {
      const weak = CARDS[e.def.weakness];
      const counter = weak ? `<br>Weak to ${iconImg(weak.icon, '', 14)} <b>${esc(weak.name)}</b>: playing it Counters this enemy.` : '';
      const tip = `<b>${esc(e.name)}</b><br><span class="dim">${esc(e.def.flavor)}</span>${e.def.passive ? `<br>${highlight(e.def.passive)}` : ''}${highlight(counter)}`;
      const rank = e.def.boss ? ' boss' : e.def.elite ? ' elite' : '';
      const cls = `plate${rank}${targeting && e.alive ? ' targetable' : ''}${e.alive ? '' : ' gone'}`;
      const tag = e.def.boss ? '<i>SEV-0</i>' : e.def.elite ? '<i>SEV-2</i>' : '';
      const name = e.def.boss ? e.def.title : e.name;
      return (
        `<div class="${cls}" data-anchor="e:${e.uid}" data-act="enemy" data-uid="${e.uid}">` +
        (e.alive ? `<div class="plate-top">${intent(c, e)}${badge(c, e)}</div>` : '') +
        `<div class="plate-box" data-tip="${attr(tip)}">` +
        `<div class="pname">${tag}${esc(name)}</div>` +
        hpBar(Math.max(0, e.hp), e.maxHp, e.block, true, `e${e.uid}`) +
        statuses(e.status) +
        '</div></div>'
      );
    })
    .join('');
}

// Cards already shown this combat; anything new gets a deal-in animation.
let seenCombat = null;
let seenHand = new Set();

export function bottom() {
  const c = ui.c;
  if (seenCombat !== c) {
    seenCombat = c;
    seenHand = new Set();
  }
  const n = c.hand.length;
  let anyPlayable = false;
  let dealt = 0;
  const hand = c.hand
    .map((inst, i) => {
      const ok = c.canPlay(i) && !ui.busy;
      if (ok) anyPlayable = true;
      const isNew = !seenHand.has(inst.uid);
      const style = `--t:${i - (n - 1) / 2};--d:${isNew ? dealt++ : 0}`;
      return renderCard(inst, {
        c,
        playable: ok,
        selected: ui.sel === i,
        hotkey: i < 10 ? String((i + 1) % 10) : '',
        act: 'card',
        data: { idx: i, flip: inst.uid },
        cls: isNew ? 'deal' : '',
        counter: c.enemiesAlive().some((e) => e.def.weakness === inst.id && !e.mem.caught),
        style,
      });
    })
    .join('');
  seenHand = new Set(c.hand.map((inst) => inst.uid));
  const energyTip = `<b>Compute</b><br>${KEYWORDS.Compute}`;
  const nudge = !anyPlayable && !ui.busy && !c.over;
  const pile = (key, label, count, tip) =>
    `<button class="pile" data-act="pile" data-pile="${key}" data-tip="${tip}"><b>${count}</b>${label}</button>`;
  return (
    '<div class="combat-bottom">' +
    `<div class="ctxbar-wrap" id="ctxwrap">${ctxMeter(null)}</div>` +
    '<div class="cb-row">' +
    '<div class="left-dock">' +
    `<div class="energy${c.p.energy === 0 ? ' empty' : ''}" data-tip="${attr(energyTip)}"><b>${c.p.energy}</b><small>/${c.p.maxEnergy}</small></div>` +
    '<div class="piles">' +
    pile('draw', 'DRAW', c.draw_.length, 'Draw pile') +
    pile('discard', 'DISC', c.discard.length, 'Discard pile') +
    pile('exhaust', 'EXH', c.exhaust.length, 'Exhausted this combat') +
    '</div></div>' +
    `<div class="hand">${hand || '<div class="hand-empty">No cards in hand</div>'}</div>` +
    '<div class="right-dock">' +
    `<button class="ds-btn red end-turn${nudge ? ' nudge' : ''}" data-act="end-turn"${ui.busy || c.over ? ' disabled' : ''}>` +
    `${ui.busy ? 'ENEMY<br>TURN…' : 'END<br>TURN'}</button><div class="dim small key-hint">[E]</div>` +
    '<div class="dim small touch-hint">Hold a card<br>to read it</div>' +
    '</div></div></div>'
  );
}

// Overlap cards just enough to fit the hand in one row.
export function afterRender() {
  const hand = document.querySelector('#app .hand');
  const cards = hand ? hand.querySelectorAll('.card') : [];
  if (!cards.length) return;
  const w = cards[0].offsetWidth;
  const n = cards.length;
  const room = hand.clientWidth - 12;
  const gap = n > 1 ? Math.min(6, (room - n * w) / (n - 1)) : 0;
  hand.style.setProperty('--ov', `${Math.round(gap)}px`);
}

// Context meter, optionally previewing the card at hand index `previewIdx`.
function ctxMeter(previewIdx) {
  const c = ui.c;
  const max = c.p.maxContext;
  const cur = c.p.context;
  let add = 0;
  let view = null;
  if (previewIdx !== null && c.hand[previewIdx]) {
    view = cardView(c.hand[previewIdx]);
    if (!view.unplayable) add = c.tokensFor(view);
  }
  const after = cur + add;
  const over = view && !view.unplayable && after > max;
  const thr = c.deepThreshold();
  let segs = '';
  for (let i = 0; i < max; i++) {
    let cls = 'seg';
    if (i < cur) cls += ' on';
    else if (i < after) cls += ' preview';
    if (i >= thr - 1 && i < after) cls += ' deep';
    segs += `<div class="${cls}"></div>`;
  }
  let state;
  let stateCls = 'state';
  if (over) {
    state = `⚠ +${add} → ${after}/${max} OVERFLOW: you will Hallucinate`;
    stateCls += ' over';
  } else if (view && add > 0) {
    state = `+${add} tokens → ${after}/${max}${after >= thr ? ' · DEEP (+50% attack dmg)' : ''}`;
    if (after >= thr) stateCls += ' deep';
  } else if (c.isDeep()) {
    state = 'DEEP CONTEXT: attacks deal +50%';
    stateCls += ' deep';
  } else {
    state = `Deep at ${thr} · Overflow above ${max}`;
  }
  const tip = `<b>Context window</b><br>${KEYWORDS.Context}<br><br><b>Deep Context</b><br>At ${thr}+ tokens your attacks deal +50% damage.<br><br><b>Overflow</b><br>${KEYWORDS.Overflow}`;
  return (
    `<div class="ctxbar-head"><span class="title">CONTEXT ${cur}/${max}</span><span class="${stateCls}">${state}</span></div>` +
    `<div class="ctxbar${over ? ' overflow-preview' : ''}" data-tip="${attr(tip)}">${segs}` +
    `<div class="thresh" style="left:calc(${(thr / max) * 100}% - 1px)"></div></div>`
  );
}

export function updateMeter(idx) {
  const el = document.getElementById('ctxwrap');
  if (el && ui.c) el.innerHTML = ctxMeter(idx);
}
