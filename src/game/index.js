// Public surface of the game logic. Everything under src/game is pure JS: no DOM, no three.js,
// so it runs unchanged in the browser, in Vitest and in the balance simulator.
export { RNG } from './core/rng.js';
export { uid } from './core/ids.js';
export { KEYWORDS, MAPPING } from './core/glossary.js';
export { CARDS, cardView, newCard, canUpgrade, cardPool } from './data/cards/index.js';
export { CHARACTERS } from './data/characters.js';
export { ENEMIES, FAILURES, countersOf } from './data/enemies/index.js';
export { BOSS_IDS, ENCOUNTERS, FIRST_ENCOUNTER } from './data/encounters.js';
export { EVENTS } from './data/events.js';
export { MODES, modeOf } from './data/modes.js';
export { PLUGINS, pluginPool } from './data/plugins.js';
export { SCRIPTS } from './data/scripts.js';
export { ChapterMap } from './engine/map.js';
export { Combat } from './engine/combat.js';
export { Run } from './engine/run.js';
