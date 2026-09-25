// Modal dialogs and the card picker (deck view, rewards, upgrades, removals).
import { CARDS, canUpgrade, newCard } from '../game/data/cards/index.js';
import { Run } from '../game/engine/run.js';
import { esc } from '../lib/html.js';
import { defineActions } from './actions.js';
import { renderCard } from './components/card.js';
import { dom } from './dom.js';
import { ui } from './state.js';

export function renderModal() {
  dom.modal.innerHTML = ui.modal ? `<div class="modal-box">${ui.modal()}</div>` : '';
}

// body() is re-run on every renderModal(), so modals can reflect changing state.
export function openModal(body) {
  ui.modal = body;
  renderModal();
}

export function closeModal() {
  ui.modal = null;
  ui.picker = null;
  renderModal();
}

// Esc / backdrop click: skip or close, unless the choice is mandatory.
export function dismissModal() {
  const p = ui.picker;
  if (p?.mandatory) return;
  if (p?.onSkip) p.onSkip();
  else closeModal();
}

// opts: { title, sub, items:[inst], flip, onPick(inst), skip:label|null, onSkip, mandatory }
export function picker(opts) {
  ui.picker = opts;
  openModal(() => {
    const p = ui.picker;
    const cards = p.items
      .map((inst, i) => {
        const base = renderCard(inst, { act: p.onPick ? 'pick' : null, data: { i }, cls: 'face-base' });
        const up =
          p.flip && canUpgrade(inst)
            ? renderCard({ uid: inst.uid, id: inst.id, up: true }, { act: 'pick', data: { i }, cls: 'face-up' })
            : '';
        return `<div class="pick-wrap${p.flip ? ' flip' : ''}">${base}${up}</div>`;
      })
      .join('');
    let actions = '';
    if (!p.mandatory) {
      actions = p.skip
        ? `<button class="ds-btn gray" data-act="pick-skip">${esc(p.skip)}</button>`
        : '<button class="ds-btn gray" data-act="close-modal">CLOSE</button>';
    }
    return (
      (p.mandatory ? '' : `<button class="pill close-x" data-act="${p.skip ? 'pick-skip' : 'close-modal'}">✕</button>`) +
      `<h2>${esc(p.title)}</h2>${p.sub ? `<div class="dim">${esc(p.sub)}</div>` : ''}` +
      `<div class="card-grid">${cards || '<div class="dim">Nothing here.</div>'}</div>` +
      (actions ? `<div class="modal-actions">${actions}</div>` : '')
    );
  });
}

const TYPE_ORDER = { attack: 0, skill: 1, power: 2, status: 3, curse: 4 };
export function sortedDeck(list) {
  return list.slice().sort((a, b) => {
    const da = CARDS[a.id];
    const db = CARDS[b.id];
    return TYPE_ORDER[da.type] - TYPE_ORDER[db.type] || da.name.localeCompare(db.name);
  });
}

// mandatory: the player already paid for this choice (events), so it can't be cancelled.
export function chooseUpgrade(done, mandatory) {
  const items = sortedDeck(ui.run.deck.filter(canUpgrade));
  if (!items.length) return done?.(false);
  picker({
    title: 'Fine-tune a card',
    sub: 'Hover to preview the upgrade. Click to confirm.',
    items,
    flip: true,
    mandatory,
    onPick: (inst) => {
      Run.upgradeCard(ui.run, inst.uid);
      closeModal();
      done?.(true);
    },
    skip: 'CANCEL',
    onSkip: () => {
      closeModal();
      done?.(false);
    },
  });
}

export function chooseRemove(done, mandatory) {
  if (!ui.run.deck.length) return done?.(false);
  picker({
    title: 'Deprecate a card',
    sub: 'Remove a card from your deck permanently.',
    items: sortedDeck(ui.run.deck),
    mandatory,
    onPick: (inst) => {
      Run.removeCard(ui.run, inst.uid);
      closeModal();
      done?.(true);
    },
    skip: 'CANCEL',
    onSkip: () => {
      closeModal();
      done?.(false);
    },
  });
}

export function chooseNewCard(ids, title, done) {
  picker({
    title: title || 'Choose a card',
    sub: 'Add one to your deck, or skip.',
    items: ids.map((id) => newCard(id)),
    onPick: (inst) => {
      ui.run.deck.push(inst);
      closeModal();
      done?.(true);
    },
    skip: 'SKIP',
    onSkip: () => {
      closeModal();
      done?.(false);
    },
  });
}

export function viewCards(title, sub, items) {
  picker({ title, sub, items, onPick: null, skip: null });
}

defineActions({
  'close-modal': closeModal,
  pick: (d) => ui.picker?.onPick?.(ui.picker.items[+d.i]),
  'pick-skip': () => {
    if (ui.picker?.onSkip) ui.picker.onSkip();
    else closeModal();
  },
});
