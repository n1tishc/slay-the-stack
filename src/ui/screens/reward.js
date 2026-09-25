// Post-combat rewards: a postmortem of the failure modes you fought, their Practice cards,
// credits, a plugin (elites), a script, and a card choice.
import { iconImg } from '../../art/icons.js';
import { CARDS } from '../../game/data/cards/index.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { PLUGINS } from '../../game/data/plugins.js';
import { SCRIPTS } from '../../game/data/scripts.js';
import { Run } from '../../game/engine/run.js';
import { defineActions } from '../actions.js';
import { esc, firstSentence } from '../../lib/html.js';
import { choice } from '../components/choice.js';
import { toMap } from '../flow.js';
import { chooseNewCard } from '../modal.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

export const strip = true;

// One row per failure mode: the real-world fix, its Practice card and its Field Guide entry.
function practiceButton(r, def) {
  const card = CARDS[def.weakness];
  const label = `${iconImg(card.icon, '', 16)} ${esc(card.name)}`;
  if (r.taken[`l:${card.id}`]) return `<span class="pm-have">✓ Added ${label}</span>`;
  if (!r.lessons?.includes(card.id)) return `<span class="pm-have">✓ ${label} in deck</span>`;
  return `<button class="choice pm-add" data-act="take-lesson" data-id="${card.id}"><small>+ ADD</small>${label}</button>`;
}

function postmortem(r) {
  if (!r.failures?.length) return '';
  const rows = r.failures
    .map((id) => {
      const def = ENEMIES[id];
      const tag = r.fresh?.includes(id) ? '<span class="pm-new">NEW</span>' : '';
      return (
        `<div class="pm-row">${iconImg(def.icon, 'pm-ico', 24)}` +
        `<div class="pm-txt"><b>${esc(def.name)}</b>${tag}` +
        `<button class="pm-link" data-act="field-guide" data-id="${id}">Field Guide ›</button>` +
        `<span>${esc(firstSentence(def.lesson.fix))}</span></div>` +
        `<div class="pm-side">${practiceButton(r, def)}</div></div>`
      );
    })
    .join('');
  return `<div class="postmortem"><div class="pm-h">POSTMORTEM · IN REAL LIFE</div>${rows}</div>`;
}

export function bottom() {
  const r = ui.reward;
  const t = r.taken;
  const items = [];
  if (r.credits) items.push(choice('take-credits', '💰', `${r.credits} API Credits`, 'Spend them at the Marketplace.', t.credits));
  if (r.plugin) {
    const p = PLUGINS[r.plugin];
    items.push(choice('take-plugin', p.icon, `Plugin: ${p.name}`, p.desc, t.plugin));
  }
  if (r.script) {
    const s = SCRIPTS[r.script];
    const full = ui.run.scripts.length >= ui.run.maxScripts;
    items.push(choice('take-script', s.icon, `Script: ${s.name}`, s.desc + (full ? ' (slots full)' : ''), t.script, full));
  }
  if (r.cards) items.push(choice('take-cards', '🃏', 'Add a card to your deck', 'Choose 1 of 3 new cards.', t.cards));
  // Once everything worth taking is taken, the way on is the obvious next step.
  const left =
    (r.credits && !t.credits) ||
    (r.plugin && !t.plugin) ||
    (r.script && !t.script && ui.run.scripts.length < ui.run.maxScripts) ||
    (r.cards && !t.cards) ||
    r.lessons?.some((id) => !t[`l:${id}`]);
  return (
    `<div class="room-bottom${r.failures?.length ? ' with-pm' : ''}"><div class="room-title">${r.escaped ? 'IT GOT AWAY' : r.kind === 'elite' ? 'INCIDENT RESOLVED' : 'BUG FIXED'}</div>` +
    postmortem(r) +
    `<div class="choices">${items.join('')}</div>` +
    `<div class="room-actions"><button class="ds-btn blue${left ? '' : ' nudge'}" data-act="to-map">CONTINUE ▶</button></div></div>`
  );
}

defineActions({
  'to-map': toMap,
  'take-lesson': (d) => {
    if (ui.reward.taken[`l:${d.id}`]) return;
    Run.addCard(ui.run, d.id);
    ui.reward.taken[`l:${d.id}`] = true;
    say(`Added ${CARDS[d.id].name} to your deck. Lesson learned.`);
    ui.sc.celebrate?.();
    render();
  },
  'take-credits': () => {
    ui.run.credits += ui.reward.credits;
    ui.reward.taken.credits = true;
    say(`+${ui.reward.credits} API Credits.`);
    render();
  },
  'take-plugin': () => {
    Run.addPlugin(ui.run, ui.reward.plugin);
    ui.reward.taken.plugin = true;
    say(`Installed ${PLUGINS[ui.reward.plugin].name}!`);
    ui.sc.celebrate?.();
    render();
  },
  'take-script': () => {
    if (!Run.addScript(ui.run, ui.reward.script)) return;
    ui.reward.taken.script = true;
    render();
  },
  'take-cards': () => {
    chooseNewCard(ui.reward.cards, 'Add a card to your deck', (took) => {
      if (took) {
        ui.reward.taken.cards = true;
        ui.sc.celebrate?.();
      }
      render();
    });
  },
});
