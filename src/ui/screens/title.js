// Title screen: logo over the 3D scene, main menu on the bottom screen.
import { iconImg } from '../../art/icons.js';
import { robotURL } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { ENEMIES, FAILURES } from '../../game/data/enemies/index.js';
import { Run } from '../../game/engine/run.js';
import { esc } from '../../lib/html.js';
import { EVENTS } from '../../game/data/events.js';
import { loadCalls, loadGuide, loadHistory } from '../../settings.js';
import { defineActions } from '../actions.js';
import { continueRun, toCharSelect, toTitle } from '../flow.js';
import { toPractice } from './practice.js';

export function hud() {
  return '<div class="logo-wrap"><div class="logo">SLAY THE<br><span>STACK</span></div><div class="logo-sub">a roguelike deckbuilder in production</div></div>';
}

function tile(act, color, icon, label, sub, extra = '') {
  return (
    `<button class="tile ${color}" data-act="${act}"${extra}>` +
    `<span class="tile-ico">${icon}</span><span class="tile-txt"><b>${label}</b><small>${sub}</small></span></button>`
  );
}

export function bottom() {
  const save = Run.load();
  const hist = loadHistory();
  const wins = hist.filter((h) => h.win).length;
  const found = loadGuide().length;
  const calls = loadCalls();
  const missed = EVENTS.filter((e) => calls[e.id] && calls[e.id] !== 'best').length;
  const fresh = EVENTS.filter((e) => !calls[e.id]).length;
  const practiceSub = missed
    ? `${missed} to revisit · ${fresh} not tried yet`
    : fresh
      ? `${EVENTS.length} Slack scenarios, no run needed · ${fresh} not tried yet`
      : `All ${EVENTS.length} scenarios answered with the best call`;
  let cont;
  if (save) {
    const ch = CHARACTERS[save.char];
    const boss = ENEMIES[save.boss || 'outage'];
    const floor = save.pos ? (save.pos.boss ? 'SEV-0' : `floor ${save.pos.row + 1}`) : 'start';
    cont = tile(
      'continue',
      'blue',
      `<img class="px-ico" src="${robotURL(save.char, 'front')}" alt="">`,
      `CONTINUE · ${ch.name.toUpperCase()}`,
      `${floor} · ${save.hp}/${save.maxHp} HP · vs ${esc(boss.title)} ${iconImg(boss.icon, '', 16)}`,
    );
  } else {
    cont = tile('continue', 'blue', iconImg('💾', '', 24), 'CONTINUE', 'No run in progress', ' disabled');
  }
  return (
    '<div class="menu-screen">' +
    '<div class="tiles">' +
    tile('new-run', 'red big', iconImg('🚨', '', 32), 'NEW RUN', 'Production is down. Pick a model to take the pager.') +
    cont +
    tile('practice', 'teal', iconImg('💬', '', 24), 'PRACTICE', practiceSub) +
    tile(
      'field-guide',
      'purple',
      iconImg('🧭', '', 24),
      'FIELD GUIDE',
      found ? `${found}/${FAILURES.length} failure modes found` : 'Fight a failure mode to unlock it',
    ) +
    tile('howto', 'green', iconImg('📖', '', 24), 'HOW TO PLAY', 'Rules, the Context twist, glossary') +
    tile(
      'history',
      'yellow',
      iconImg('🏆', '', 24),
      'RUN HISTORY',
      hist.length ? `${hist.length} runs · ${wins} wins` : 'No runs yet',
      hist.length ? '' : ' disabled',
    ) +
    tile('settings', 'gray', iconImg('⚙️', '', 24), 'SETTINGS', 'Speed, motion, pixels') +
    '</div>' +
    `<div class="blink-hint">${FAILURES.length} ways coding agents go wrong · learn the fix for each</div>` +
    '</div>'
  );
}

defineActions({
  'new-run': toCharSelect,
  practice: toPractice,
  continue: continueRun,
  'to-title': toTitle,
});
