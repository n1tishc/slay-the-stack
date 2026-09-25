// Global input wiring: delegated clicks, keyboard shortcuts, right-click cancel, meter preview.
import { dispatch } from './actions.js';
import { cancelTargeting, combatKey } from './combat/controller.js';
import { updateMeter } from './combat/view.js';
import { dom } from './dom.js';
import { dismissModal } from './modal.js';
import { isTargeting, ui } from './state.js';

const inCombat = () => ui.screen === 'combat' && ui.c;

export function initInput() {
  dom.app.addEventListener('click', (e) => {
    // Clicking empty space while choosing a target cancels the selection.
    if (!e.target.closest('[data-act]') && ui.screen === 'combat' && isTargeting()) {
      cancelTargeting();
      return;
    }
    dispatch(e);
  });
  dom.world.addEventListener('click', dispatch);
  dom.modal.addEventListener('click', (e) => {
    if (e.target === dom.modal) dismissModal();
    else dispatch(e);
  });

  document.addEventListener('contextmenu', (e) => {
    if (ui.screen === 'combat' && isTargeting()) {
      e.preventDefault();
      cancelTargeting();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (ui.modal) dismissModal();
      else if (isTargeting()) cancelTargeting();
      return;
    }
    if (ui.modal || !inCombat()) return;
    combatKey(e.key);
  });

  // Hovering a hand card previews its token cost on the Context meter.
  dom.app.addEventListener('mouseover', (e) => {
    if (!inCombat()) return;
    const card = e.target.closest('.hand .card');
    if (card) updateMeter(+card.dataset.idx);
  });
  dom.app.addEventListener('mouseout', (e) => {
    if (!inCombat()) return;
    const card = e.target.closest('.hand .card');
    if (card && !card.contains(e.relatedTarget)) updateMeter(ui.sel);
  });
}
