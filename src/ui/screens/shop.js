// Marketplace: cards, plugins, scripts and one card removal per visit.
import { CARDS } from '../../game/data/cards/index.js';
import { PLUGINS } from '../../game/data/plugins.js';
import { SCRIPTS } from '../../game/data/scripts.js';
import { Run } from '../../game/engine/run.js';
import { defineActions } from '../actions.js';
import { renderCard } from '../components/card.js';
import { choice } from '../components/choice.js';
import { chooseRemove } from '../modal.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

export const strip = true;

export function bottom() {
  const s = ui.shop;
  const run = ui.run;
  const cards = s.cards
    .map((it, i) => {
      const inst = { uid: -1 - i, id: it.id, up: false };
      return (
        `<div class="shop-card${it.sold ? ' sold' : ''}">${renderCard(inst, { act: 'buy-card', data: { i } })}` +
        `<div class="price${run.credits < it.price ? ' cant' : ''}">${it.sale ? `<span class="was">${it.price * 2}</span>` : ''}◈${it.price}</div></div>`
      );
    })
    .join('');
  const plugins = s.plugins
    .map((it, i) => {
      const p = PLUGINS[it.id];
      return choice(
        'buy-plugin',
        p.icon,
        `${p.name} · ◈${it.price}`,
        p.desc,
        it.sold,
        !it.sold && run.credits < it.price,
        ` data-i="${i}"`,
      );
    })
    .join('');
  const full = run.scripts.length >= run.maxScripts;
  const scripts = s.scripts
    .map((it, i) => {
      const sc = SCRIPTS[it.id];
      return choice(
        'buy-script',
        sc.icon,
        `${sc.name} · ◈${it.price}`,
        sc.desc,
        it.sold,
        !it.sold && (run.credits < it.price || full),
        ` data-i="${i}"`,
      );
    })
    .join('');
  const remove = choice(
    'shop-remove',
    '🗑️',
    `Deprecate a card · ◈${run.removeCost}`,
    'Remove a card from your deck. Once per visit.',
    s.removeUsed,
    !s.removeUsed && run.credits < run.removeCost,
  );
  return (
    '<div class="room-bottom shop"><div class="shop-top"><div class="room-title">MARKETPLACE</div><button class="ds-btn blue" data-act="to-map">LEAVE ▶</button></div>' +
    `<div class="shop-cards">${cards}</div>` +
    `<div class="shop-grid">${plugins}${scripts}${remove}</div>` +
    '</div>'
  );
}

defineActions({
  'buy-card': (d) => {
    const it = ui.shop.cards[+d.i];
    if (it.sold || ui.run.credits < it.price) return;
    ui.run.credits -= it.price;
    Run.addCard(ui.run, it.id);
    it.sold = true;
    say(`Bought ${CARDS[it.id].name}. Pleasure doing business!`);
    render();
  },
  'buy-plugin': (d) => {
    const it = ui.shop.plugins[+d.i];
    if (it.sold || ui.run.credits < it.price) return;
    ui.run.credits -= it.price;
    Run.addPlugin(ui.run, it.id);
    it.sold = true;
    say(`Installed ${PLUGINS[it.id].name}!`);
    render();
  },
  'buy-script': (d) => {
    const it = ui.shop.scripts[+d.i];
    if (it.sold || ui.run.credits < it.price) return;
    if (!Run.addScript(ui.run, it.id)) return;
    ui.run.credits -= it.price;
    it.sold = true;
    render();
  },
  'shop-remove': () => {
    if (ui.shop.removeUsed || ui.run.credits < ui.run.removeCost) return;
    chooseRemove((ok) => {
      if (ok) {
        ui.run.credits -= ui.run.removeCost;
        ui.run.removeCost += 25;
        ui.shop.removeUsed = true;
        say('Deprecated. Your deck feels lighter.');
      }
      render();
    });
  },
});
