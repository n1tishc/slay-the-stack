// Downtime (rest site): sleep to heal, or fine-tune (upgrade) a card.
import { canUpgrade } from '../../game/data/cards/index.js';
import { Run } from '../../game/engine/run.js';
import { defineActions } from '../actions.js';
import { choice } from '../components/choice.js';
import { chooseUpgrade } from '../modal.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

export const strip = true;

const healAmount = (run) => Math.floor(run.maxHp * 0.3);

export function bottom() {
  const run = ui.run;
  const canUp = run.deck.some(canUpgrade);
  const body = ui.rest.done
    ? '<div class="room-actions"><button class="ds-btn blue" data-act="to-map">CONTINUE ▶</button></div>'
    : '<div class="choices two">' +
      choice('rest-sleep', '😴', 'Sleep', `Heal ${healAmount(run)} HP (30% of max).`) +
      choice('rest-tune', '🎛️', 'Fine-tune', canUp ? 'Upgrade a card in your deck.' : 'Nothing left to upgrade.', false, !canUp) +
      '</div>';
  return `<div class="room-bottom"><div class="room-title">DOWNTIME</div>${body}</div>`;
}

defineActions({
  'rest-sleep': () => {
    const n = healAmount(ui.run);
    Run.heal(ui.run, n);
    ui.rest = { done: true };
    say(`You sleep through three alerts. Healed ${n} HP.`);
    ui.sc.celebrate?.();
    render();
  },
  'rest-tune': () => {
    chooseUpgrade((ok) => {
      if (ok) {
        ui.rest = { done: true };
        say('Fine-tuning complete. Loss went down. Card upgraded!');
        ui.sc.celebrate?.();
      }
      render();
    });
  },
});
