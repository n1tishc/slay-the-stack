// The three.js side of the top screen. Loaded lazily by ./index.js, so the first paint
// never waits for three.js.
import { battle } from './scenes/battle.js';
import { charSelect } from './scenes/char-select.js';
import { mapScene } from './scenes/map.js';
import { room } from './scenes/room.js';
import { title } from './scenes/title.js';

export {
  initStage,
  isReady,
  resize,
  showScene,
  currentScene,
  stageInfo,
  screenPos,
  setWorldHTML,
  float,
  flash,
  glitch,
  shake,
} from './stage.js';

export const scenes = { battle, charSelect, mapScene, room, title };
