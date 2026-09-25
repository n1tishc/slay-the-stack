// Bottom-screen header: model, HP, credits, floor, plugins, script slots and menu pills.
import { iconImg } from '../../art/icons.js';
import { robotURL } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { PLUGINS } from '../../game/data/plugins.js';
import { SCRIPTS } from '../../game/data/scripts.js';
import { attr } from '../../lib/html.js';
import { ui } from '../state.js';
import { pluginTip, scriptTip } from './tips.js';

export function floorLabel(run) {
  if (!run.pos) return 0;
  return run.pos.boss ? 'SEV-0' : run.pos.row + 1;
}

export function statusStrip() {
  const run = ui.run;
  const ch = CHARACTERS[run.char];
  const inCombat = ui.screen === 'combat';
  const plugins = run.plugins
    .map((id) => {
      const used = id === 'circuit_breaker' && run.circuitUsed;
      return `<div class="plugin-ico${used ? ' used' : ''}" data-tip="${attr(pluginTip(id))}">${iconImg(PLUGINS[id].icon, '', 18)}</div>`;
    })
    .join('');
  let scripts = '';
  for (let i = 0; i < run.maxScripts; i++) {
    const sid = run.scripts[i];
    scripts += sid
      ? `<div class="script-slot filled${ui.selScript === i ? ' selected' : ''}" data-act="script" data-slot="${i}" data-tip="${attr(scriptTip(sid, inCombat))}">${iconImg(SCRIPTS[sid].icon, '', 18)}</div>`
      : `<div class="script-slot" data-tip="${attr('<b>Empty script slot</b><br>Scripts are one-shot consumables.')}"></div>`;
  }
  const hp = ui.c && inCombat ? ui.c.p.hp : run.hp;
  return (
    '<div class="strip">' +
    `<div class="who"><img class="px-ico who-bot" src="${robotURL(run.char, 'front')}" alt="">${ch.name}</div>` +
    `<div class="stat" data-tip="${attr('<b>Uptime (HP)</b><br>Hit 0 and your run is over.')}"><span class="hp">♥</span>${hp}/${run.maxHp}</div>` +
    `<div class="stat" data-tip="${attr('<b>API Credits</b><br>Spend them at the Marketplace.')}"><span class="cr">◈</span>${run.credits}</div>` +
    `<div class="stat dim">FL ${floorLabel(run)}</div>` +
    `<div class="plugins">${plugins}</div>` +
    `<div class="scripts">${scripts}</div>` +
    '<div class="spacer"></div>' +
    `<button class="pill" data-act="view-deck">DECK ${run.deck.length}</button>` +
    '<button class="pill" data-act="howto">GUIDE</button>' +
    '<button class="pill" data-act="settings" aria-label="Settings">⚙</button>' +
    '<button class="pill" data-act="abandon">QUIT</button>' +
    '</div>'
  );
}
