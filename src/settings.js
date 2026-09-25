// Everything the game keeps in storage: player settings, the run in progress, run history and
// learning progress. Shared by the DOM UI and the 3D stage.
import { Run } from './game/engine/run.js';
import { loadJSON, loadText, removeKey, saveJSON, saveText } from './lib/storage.js';

const SETTINGS_KEY = 'slay-the-stack-settings-v1';
const RUN_KEY = 'slay-the-stack-save-v1';
const HISTORY_KEY = 'slay-the-stack-history-v1';
const HISTORY_LIMIT = 30;
const GUIDE_KEY = 'slay-the-stack-guide-v1';
const CALLS_KEY = 'slay-the-stack-calls-v1';

export const settings = {
  speed: 1,
  shake: true,
  reducedMotion: false,
  pixel: 'chunky',
  retro: true, // low colour depth + dithering on the top screen
  textSize: 'normal', // 'large' scales the reading text (readable.css)
  mode: 'learning', // difficulty for the next run (game/data/modes.js); new players start on Learning
  hardUnlocked: false, // set by the first win on Standard or Hard
};

// Saved settings win; otherwise honour the OS "reduce motion" preference.
export function loadSettings() {
  const saved = loadJSON(SETTINGS_KEY, null);
  if (saved) {
    Object.assign(settings, saved);
    // Settings saved before difficulty existed: players with runs behind them keep Standard.
    if (!saved.mode) settings.mode = loadHistory().length ? 'standard' : 'learning';
  } else if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) settings.reducedMotion = true;
}

export function saveSettings() {
  saveJSON(SETTINGS_KEY, settings);
}

// Scale a UI delay (ms) by the game-speed setting.
export function scaled(ms) {
  return ms / settings.speed;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, scaled(ms)));
}

// The run in progress, saved at the map. A save that cannot be read counts as no save.
export function saveRun(run) {
  saveText(RUN_KEY, Run.serialize(run));
}

export function loadRun() {
  const s = loadText(RUN_KEY);
  try {
    return s ? Run.deserialize(s) : null;
  } catch {
    return null;
  }
}

export function clearRun() {
  removeKey(RUN_KEY);
}

export function loadHistory() {
  return loadJSON(HISTORY_KEY, []);
}

// Hard unlocks with a win on Standard or Hard (history from before modes existed counts as Standard).
export function hardUnlocked() {
  return settings.hardUnlocked || loadHistory().some((h) => h.win && h.mode !== 'learning');
}

export function addHistory(entry) {
  saveJSON(HISTORY_KEY, [entry, ...loadHistory()].slice(0, HISTORY_LIMIT));
}

// Failure modes met so far: each one unlocks its Field Guide entry.
export function loadGuide() {
  return loadJSON(GUIDE_KEY, []);
}

// Records the failure modes in a fight and returns the ones met for the first time.
export function markGuide(ids) {
  const seen = loadGuide();
  const fresh = [...new Set(ids)].filter((id) => !seen.includes(id));
  if (fresh.length) saveJSON(GUIDE_KEY, [...seen, ...fresh]);
  return fresh;
}

// The grade of the last answer to each scenario, across runs: missed ones come back later
// (Run.pickEvent).
export function loadCalls() {
  return loadJSON(CALLS_KEY, {});
}

export function recordCall(id, grade) {
  saveJSON(CALLS_KEY, { ...loadCalls(), [id]: grade });
}
