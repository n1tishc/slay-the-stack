// Combat input and turn flow: play cards, target enemies, run the enemy turn step by step.
import { CARDS, cardView } from '../../game/data/cards/index.js';
import { SCRIPTS } from '../../game/data/scripts.js';
import { Combat } from '../../game/engine/combat.js';
import { Run } from '../../game/engine/run.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { groupNames } from '../../lib/html.js';
import { markGuide, scaled, wait } from '../../settings.js';
import { battle, battleTransition, clearTransition, loadStage, revealTransition, showScene } from '../../stage/index.js';
import { resetBars } from '../components/hp-bar.js';
import { defineActions } from '../actions.js';
import { character, gameOver, showRoom } from '../flow.js';
import { viewCards, sortedDeck } from '../modal.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { isTargeting, ui } from '../state.js';
import { banner, castGhost, playFx } from './fx.js';
import { updateMeter } from './view.js';

export async function startCombat(kind) {
  const run = ui.run;
  const ids = Run.encounter(run, kind);
  ui.busy = true;
  await battleTransition(kind);
  // A battle needs the 3D scene (hit targets, anchors). It has normally loaded long before.
  const loaded = await loadStage().then(
    () => true,
    () => false,
  );
  if (ui.run !== run) return; // the player quit during the transition
  if (!loaded) {
    // Stay busy so nothing moves on; the run was saved on the map, before this fight.
    clearTransition();
    say('The battle view could not load. Check your connection, then reload: your run is saved.');
    return;
  }
  ui.c = new Combat(run, ids, kind).start();
  // Meeting a failure mode unlocks its Field Guide entry, even if the fight goes badly.
  ui.failures = [...new Set(ui.c.enemies.filter((e) => e.def.lesson).map((e) => e.def.id))];
  ui.newFailures = markGuide(ui.failures);
  Run.meet(run, ui.failures, ui.newFailures);
  ui.sel = null;
  ui.selScript = null;
  ui.dying = {};
  ui.screen = 'combat';
  resetBars();
  const boss = kind === 'boss' ? ENEMIES[run.boss] : null;
  ui.sc = showScene(battle, { charId: run.char, kind, arena: boss?.arena });
  ui.sc.click = (h) => {
    if (h.uid != null) clickEnemy(h.uid);
  };
  ui.busy = false;
  afterAction();
  revealTransition(kind);
  const names = ui.c.enemies.filter((e) => !e.def.minion).map((e) => e.name);
  if (kind === 'elite') {
    banner('INCIDENT', `SEV-2 · ${names[0]}`, 'bad');
    say(`INCIDENT! ${names[0]} is paging everyone!`);
  } else if (boss) {
    banner('SEV-0', boss.title, 'bad');
    say(boss.intro);
  } else {
    say(`${groupNames(names)}${names.length > 1 ? ' are' : ' is'} blocking the deploy!${counterHint(ui.newFailures)}`);
  }
}

// First meeting with a failure mode: name the card that counters it and where to find it,
// so the player learns the weakness by playing it, not by hunting through tooltips.
function counterHint(fresh) {
  if (!fresh.length) return '';
  const cards = fresh.map((id) => CARDS[ENEMIES[id].weakness]);
  if (cards.length > 1) return ` Their counters: ${cards.map((k) => k.name).join(' and ')}.`;
  const k = cards[0];
  if (ui.c.hand.some((i) => i.id === k.id)) return ` ${k.name} counters it: play the glowing card!`;
  if (ui.run.deck.some((i) => i.id === k.id)) return ` ${k.name} counters it. Play it when you draw it.`;
  return ` ${k.name} counters it. Win this fight to earn it.`;
}

// After any engine action: drain fx, re-render, sync the 3D scene, animate.
export function afterAction() {
  const c = ui.c;
  const list = c.fx.splice(0);
  list.forEach((f) => {
    if (f.kind === 'death') ui.dying[f.target] = true;
  });
  render();
  if (ui.sc?.sync) {
    ui.sc.sync(c, ui.dying);
    ui.sc.deep(c.isDeep());
    ui.sc.setTargeting(isTargeting());
  }
  playFx(list);
  if (c.over) onCombatOver();
}

function playCard(idx, targetUid) {
  const c = ui.c;
  if (ui.busy || c.over) return;
  if (!c.canPlay(idx)) {
    const v = cardView(c.hand[idx]);
    say(v.unplayable ? `${v.name} can’t be played.` : `Not enough Compute for ${v.name}.`);
    return;
  }
  if (targetUid === undefined && c.needsTarget(idx)) {
    ui.sel = ui.sel === idx ? null : idx;
    ui.selScript = null;
    render();
    ui.sc.setTargeting?.(ui.sel !== null);
    updateMeter(ui.sel);
    if (ui.sel !== null) say(`Choose a target for ${cardView(c.hand[idx]).name}.`);
    return;
  }
  ui.sel = null;
  castGhost(document.querySelector(`#app .hand .card[data-idx="${idx}"]`));
  c.play(idx, targetUid);
  afterAction();
}

function useScript(slot, targetUid) {
  const c = ui.c;
  if (ui.screen !== 'combat' || !c || ui.busy || c.over) return;
  const s = SCRIPTS[ui.run.scripts[slot]];
  if (!s) return;
  if (targetUid === undefined && s.target === 'enemy' && c.enemiesAlive().length > 1) {
    ui.selScript = ui.selScript === slot ? null : slot;
    ui.sel = null;
    render();
    ui.sc.setTargeting?.(ui.selScript !== null);
    return;
  }
  ui.selScript = null;
  say(`${character().name} ran ${s.name}!`);
  c.useScript(slot, targetUid);
  afterAction();
}

export function clickEnemy(uid) {
  if (ui.sel !== null) playCard(ui.sel, uid);
  else if (ui.selScript !== null) useScript(ui.selScript, uid);
}

export function cancelTargeting() {
  ui.sel = null;
  ui.selScript = null;
  render();
  ui.sc?.setTargeting?.(false);
}

export async function endTurn() {
  const c = ui.c;
  if (ui.busy || !c || c.over) return;
  ui.busy = true;
  ui.sel = null;
  ui.selScript = null;
  c.endTurnBegin();
  afterAction();
  const order = c.enemyOrder();
  for (let i = 0; i < order.length && !c.over; i++) {
    await wait(i === 0 ? 350 : 650);
    c.enemyAct(order[i]);
    afterAction();
  }
  if (!c.over) {
    await wait(450);
    c.endTurnFinish();
  }
  ui.busy = false;
  ui.dying = {};
  afterAction();
  if (!c.over) say(`Turn ${c.turn}. Your move, ${character().name}.`);
}

let overHandled = null;
function onCombatOver() {
  const c = ui.c;
  if (overHandled === c) return;
  overHandled = c;
  ui.busy = true;
  const bossWin = c.kind === 'boss' ? 'The SEV-0 is resolved!' : 'All bugs fixed! Time for the postmortem.';
  say(c.result === 'win' ? bossWin : `${character().name} went offline…`);
  setTimeout(() => {
    ui.busy = false;
    ui.dying = {};
    Run.finishCombat(ui.run, c);
    if (c.result === 'lose') return gameOver(false, c);
    if (c.kind === 'boss') return gameOver(true, c);
    ui.reward = Run.rewards(ui.run, c.kind, c);
    ui.reward.taken = {};
    ui.reward.kind = c.kind;
    ui.reward.failures = ui.failures;
    ui.reward.fresh = ui.newFailures;
    ui.c = null;
    ui.screen = 'reward';
    const elite = c.kind === 'elite';
    showRoom('reward', elite ? '🏅' : '✅', elite ? ['💰', '🔌'] : ['💰']);
    if (ui.reward.escaped) say('It got away with the Credits, and its Plugin. Collect what is left.');
    else say(elite ? 'Incident resolved! It dropped a Plugin.' : 'Bug fixed! Collect your rewards.');
    render();
  }, scaled(1400)); // long enough for the last enemy's faint to finish
}

defineActions({
  card: (d) => playCard(+d.idx),
  enemy: (d) => clickEnemy(+d.uid),
  script: (d) => useScript(+d.slot),
  'end-turn': endTurn,
  pile: (d) => {
    const c = ui.c;
    const list = d.pile === 'draw' ? sortedDeck(c.draw_) : d.pile === 'discard' ? c.discard.slice().reverse() : c.exhaust;
    const title = { draw: 'Draw pile', discard: 'Discard pile', exhaust: 'Exhausted' }[d.pile];
    viewCards(title, `${list.length} cards${d.pile === 'draw' ? ' (sorted, not in draw order)' : ''}`, list);
  },
});

// Keyboard: 1–0 select cards, E ends the turn.
export function combatKey(key) {
  if (key === 'e' || key === 'E') {
    endTurn();
    return;
  }
  if (/^[0-9]$/.test(key)) {
    const idx = key === '0' ? 9 : +key - 1;
    if (idx < ui.c.hand.length) playCard(idx);
  }
}
