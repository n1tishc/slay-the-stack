// UI entry point: load settings, start the top-screen renderer, wire input, show the title.
import { loadSettings } from '../settings.js';
import { initStage } from '../stage/index.js';
import { dom } from './dom.js';
import { toTitle } from './flow.js';
import { initInput } from './input.js';
import { applySettings } from './modals/settings.js';
import { initMessageBox } from './msgbox.js';
import { initTooltips } from './tooltip.js';
// Modules that only register actions.
import './modals/guide.js';
import './modals/field-guide.js';
import './modals/history.js';
import './modals/run-menu.js';

export function startApp() {
  loadSettings();
  applySettings();
  initStage(dom.top);
  initMessageBox();
  initTooltips();
  initInput();
  toTitle();
}
