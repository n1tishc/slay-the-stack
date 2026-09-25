// Character select: tabs + info panel on the bottom screen, lit robots on the top screen.
import { iconImg } from '../../art/icons.js';
import { robotURL } from '../../art/robots.js';
import { CARDS } from '../../game/data/cards/index.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { MODES } from '../../game/data/modes.js';
import { PLUGINS } from '../../game/data/plugins.js';
import { hardUnlocked, saveSettings, settings } from '../../settings.js';
import { defineActions } from '../actions.js';
import { renderCard } from '../components/card.js';
import { highlight } from '../components/keywords.js';
import { focusCharacter, startRun } from '../flow.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

// Difficulty for the run: Hard stays locked until a win on Standard.
function modePicker() {
  const open = hardUnlocked();
  const btns = Object.values(MODES)
    .map((m) => {
      const locked = m.id === 'hard' && !open;
      const on = settings.mode === m.id ? ' on' : '';
      return (
        `<button class="seg-btn${on}" data-act="pick-mode" data-id="${m.id}"${locked ? ' disabled' : ''}>` +
        `${iconImg(locked ? '🔒' : m.icon, '', 16)}${m.name}</button>`
      );
    })
    .join('');
  const m = MODES[settings.mode] || MODES.standard;
  const note = open ? '' : ' Win on Standard to unlock Hard.';
  return `<div class="cs-mode"><div class="cs-mode-row"><b>DIFFICULTY</b><div>${btns}</div></div><p>${m.desc}${note}</p></div>`;
}

export function world() {
  return Object.values(CHARACTERS)
    .map((c) => `<div class="w-label${c.id === ui.focusChar ? ' on' : ''}" data-anchor="c:${c.id}" style="--c:${c.color}">${c.name}</div>`)
    .join('');
}

export function bottom() {
  const id = ui.focusChar;
  const c = CHARACTERS[id];
  const p = PLUGINS[c.plugin];
  const tabs = Object.values(CHARACTERS)
    .map(
      (cc) =>
        `<button class="tab${cc.id === id ? ' on' : ''}" style="--c:${cc.color}" data-act="focus-char" data-id="${cc.id}">` +
        `<img class="px-ico" src="${robotURL(cc.id, 'front')}" alt="">${cc.name}</button>`,
    )
    .join('');
  const signature = CARDS[c.deck[8]];
  return (
    `<div class="cs-screen" style="--c:${c.color}">` +
    `<div class="cs-tabs"><button class="pill" data-act="to-title">◀ BACK</button>${tabs}</div>` +
    '<div class="cs-body">' +
    '<div class="panel cs-info">' +
    `<div class="cs-head"><div><div class="cs-co">${c.company.toUpperCase()}</div><div class="cs-name">${c.name}</div><div class="cs-title">${c.title}</div></div>` +
    `<div class="cs-stats"><div><b>${c.hp}</b>HP</div><div><b>${c.maxContext}</b>CONTEXT</div></div></div>` +
    `<div class="cs-blurb">${highlight(c.blurb)}</div>` +
    `<div class="cs-plugin">${iconImg(p.icon, '', 18)}<b>${p.name}</b> ${highlight(p.desc)}</div>` +
    `<div class="chips">${c.styles.map((s) => `<span class="chip">${s}</span>`).join('')}</div>` +
    modePicker() +
    '</div>' +
    `<div class="cs-side">${renderCard({ uid: 0, id: signature.id, up: false })}` +
    `<button class="ds-btn red big" data-act="pick-char" data-id="${id}">CHOOSE ${c.name.toUpperCase()}</button></div>` +
    '</div></div>'
  );
}

defineActions({
  'focus-char': (d) => focusCharacter(d.id),
  'pick-char': (d) => startRun(d.id),
  'pick-mode': (d) => {
    settings.mode = d.id;
    saveSettings();
    say(`${MODES[d.id].name} mode. ${MODES[d.id].desc}`);
    render();
  },
});
