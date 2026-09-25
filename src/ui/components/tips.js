// Tooltip bodies for plugins and scripts.
import { PLUGINS } from '../../game/data/plugins.js';
import { SCRIPTS } from '../../game/data/scripts.js';
import { esc } from '../../lib/html.js';
import { highlight } from './keywords.js';

export function pluginTip(id) {
  const p = PLUGINS[id];
  return `<b>${esc(p.name)}</b> <span class="muted">(${p.rarity} plugin)</span><br>${highlight(p.desc)}`;
}

export function scriptTip(id, inCombat) {
  const s = SCRIPTS[id];
  return `<b>${esc(s.name)}</b><br>${highlight(s.desc)}${inCombat ? '' : '<br><span class="muted">Usable during combat.</span>'}`;
}
