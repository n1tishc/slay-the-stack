// Stash (treasure): open it for a plugin and maybe some credits.
import { PLUGINS } from '../../game/data/plugins.js';
import { Run } from '../../game/engine/run.js';
import { defineActions } from '../actions.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

export const strip = true;

export function bottom() {
  const action = ui.treasure.opened
    ? '<button class="ds-btn blue" data-act="to-map">CONTINUE ▶</button>'
    : '<button class="ds-btn yellow big" data-act="open-stash">git stash pop</button>';
  return `<div class="room-bottom"><div class="room-title">STASH</div><div class="room-actions">${action}</div></div>`;
}

defineActions({
  'open-stash': () => {
    const t = ui.treasure;
    if (t.plugin) Run.addPlugin(ui.run, t.plugin);
    ui.run.credits += t.credits;
    t.opened = true;
    const p = t.plugin && PLUGINS[t.plugin];
    ui.sc.setIcon?.(p ? p.icon : '💨');
    say(p ? `Found ${p.name}! ${p.desc}${t.credits ? ` Also +${t.credits} Credits.` : ''}` : 'Empty. Someone already cherry-picked it.');
    render();
  },
});
