// Screen flow: title → character select → map → rooms/combat → … → game over.
import { canUpgrade } from '../game/data/cards/index.js';
import { CHARACTERS } from '../game/data/characters.js';
import { ENEMIES } from '../game/data/enemies/index.js';
import { ChapterMap } from '../game/engine/map.js';
import { Run } from '../game/engine/run.js';
import { addHistory, clearRun, hardUnlocked, loadCalls, loadRun, saveRun, saveSettings, settings } from '../settings.js';
import { charSelect, clearTransition, mapScene, room, showScene, title } from '../stage/index.js';
import { startCombat } from './combat/controller.js';
import { hideMessage, say } from './msgbox.js';
import { closeModal } from './modal.js';
import { render } from './render.js';
import { ui } from './state.js';

export function character() {
  return CHARACTERS[ui.run.char];
}

function setAccent() {
  document.documentElement.style.setProperty('--accent', ui.run ? character().color : '#ffcb3d');
}

export function showRoom(theme, icon, extras) {
  ui.sc = showScene(room, { theme, icon, extras, charId: ui.run.char });
}

export function toTitle() {
  ui.run = null;
  ui.c = null;
  ui.busy = false;
  setAccent();
  ui.screen = 'title';
  closeModal();
  clearTransition();
  ui.sc = showScene(title);
  hideMessage();
  render();
}

export function focusCharacter(id) {
  ui.focusChar = id;
  ui.sc?.focus?.(id);
  const c = CHARACTERS[id];
  say(`${c.name}, ${c.title}. ${c.maxContext}-token context window.`);
  render();
}

export function toCharSelect() {
  ui.screen = 'charselect';
  ui.sc = showScene(charSelect, { focus: ui.focusChar, onPick: focusCharacter });
  say('Which model takes the pager? Pick one on either screen.');
  render();
}

export function startRun(charId) {
  ui.run = Run.create(charId, undefined, settings.mode);
  ui.run.path = [];
  setAccent();
  toMap();
}

export function continueRun() {
  const run = loadRun();
  if (!run) return;
  ui.run = run;
  setAccent();
  toMap();
}

export function toMap() {
  closeModal();
  ui.screen = 'map';
  ui.c = null;
  ui.busy = false;
  saveRun(ui.run);
  const run = ui.run;
  ui.sc = showScene(mapScene, { run, avail: ChapterMap.available(run.map, run.pos) });
  ui.sc.click = (h) => goNode(h.row, h.col, !!h.boss);
  say(run.pos ? 'Pick your next stop.' : 'Pick a glowing stop to begin. The SEV-0 waits at the end of the route.');
  render();
}

function isAvailable(row, col, boss) {
  return ChapterMap.available(ui.run.map, ui.run.pos).some((n) => (boss ? n.boss : !n.boss && n.row === row && n.col === col));
}

export async function goNode(row, col, boss) {
  if (ui.busy || !isAvailable(row, col, boss)) return;
  ui.busy = true;
  const run = ui.run;
  const node = boss ? { boss: true, type: 'boss' } : run.map.nodes[row][col];
  say(`Heading to the ${ChapterMap.NODE_INFO[node.type].label}…`);
  if (ui.sc?.walkTo) await ui.sc.walkTo(node);
  if (ui.run !== run) return; // the player quit while walking
  ui.busy = false;
  enterNode(row, col, boss);
}

function enterNode(row, col, boss) {
  const run = ui.run;
  const node = boss ? { boss: true, type: 'boss' } : run.map.nodes[row][col];
  run.pos = boss ? { boss: true } : { row, col };
  run.path = run.path || [];
  run.path.push(run.pos);
  run.stats.floors++;
  const t = node.type;
  if (t === 'combat' || t === 'elite' || t === 'boss') {
    startCombat(t === 'combat' ? 'normal' : t);
    return;
  }
  if (t === 'rest') {
    ui.rest = { done: false };
    ui.screen = 'rest';
    showRoom('rest', '☕');
    say('Downtime: sleep to heal, or fine-tune to upgrade a card.');
  } else if (t === 'shop') {
    ui.shop = Run.shop(run);
    ui.screen = 'shop';
    showRoom('shop', '🛒', ['🔌', '📜']);
    say('Spend your Credits on cards, plugins and scripts, or leave.');
  } else if (t === 'event') {
    const past = loadCalls();
    ui.event = Run.pickEvent(run, past);
    ui.eventRetry = !!past[ui.event.id] && past[ui.event.id] !== 'best';
    ui.eventResult = null;
    // Shuffled, so the best call is not always in the same place.
    ui.eventOrder = Run.rng(run).shuffle(ui.event.options.map((o, i) => i));
    ui.screen = 'event';
    showRoom('event', ui.event.icon, ['💬']);
    say(`${ui.eventRetry ? 'You missed this one before. ' : ''}${scenarioPrompt(run, ui.event)}`);
  } else if (t === 'treasure') {
    const rng = Run.rng(run);
    ui.treasure = { plugin: Run.randomPlugin(run, rng), credits: rng.chance(0.5) ? rng.range(20, 40) : 0, opened: false };
    ui.screen = 'treasure';
    showRoom('treasure', '🎁');
    say('An abandoned branch. Open the stash to see what’s inside.');
  }
  render();
}

// What a best call on this scenario will earn (Run.answerScenario), without naming the card:
// the Practice's name would give the answer away.
function scenarioPrompt(run, ev) {
  const streak = run.stats.streak || 0;
  const practice = ev.failure && ENEMIES[ev.failure].weakness;
  let extra = '';
  if (practice && !run.deck.some((c) => c.id === practice)) extra = ' and a Practice card';
  else if (run.deck.some(canUpgrade)) extra = ' and a card upgrade';
  return `${streak ? `Best-call streak: ${streak}. ` : ''}A best call earns ${streak ? 'bonus ' : ''}Credits${extra}.`;
}

export function gameOver(win, c) {
  const run = ui.run;
  ui.over = {
    win,
    floor: run.pos && run.pos.boss ? 13 : run.pos ? run.pos.row + 1 : 0,
    killer:
      !win && c
        ? c.enemies
            .filter((e) => !e.def.minion)
            .map((e) => e.name)
            .join(' + ')
        : null,
  };
  const hardWasOpen = hardUnlocked();
  addHistory({
    date: new Date().toISOString().slice(0, 10),
    char: run.char,
    mode: run.mode,
    win,
    floor: ui.over.floor,
    killer: ui.over.killer,
    seed: run.seed,
    deck: run.deck.length,
    bugs: run.stats.bugsFixed,
  });
  // A win on Standard (or Hard) unlocks Hard.
  if (win && run.mode !== 'learning' && !hardWasOpen) {
    ui.over.unlocked = true;
    settings.hardUnlocked = true;
    saveSettings();
  }
  clearRun();
  ui.c = null;
  ui.screen = 'over';
  showRoom(win ? 'win' : 'lose', win ? '🏆' : '💀', win ? ['🎉', '✨', '🎉'] : ['🔥', '📟']);
  const name = character().name;
  say(
    win
      ? `${name} resolved the SEV-0. The status page turns green. Everyone goes back to sleep.`
      : `${name} was taken offline by ${ui.over.killer}. The pager goes to the next model.`,
  );
  render();
}
