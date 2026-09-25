import './styles/main.css';
import * as game from './game/index.js';
import * as stage from './stage/index.js';
import { settings } from './settings.js';
import { startApp } from './ui/app.js';
import { startCombat } from './ui/combat/controller.js';
import { toMap } from './ui/flow.js';
import { render } from './ui/render.js';
import { ui } from './ui/state.js';

startApp();

// Debug handle for the console and end-to-end tests.
window.SS = { ...game, UI: ui, Stage: stage, settings, debug: { startCombat, toMap, render } };
