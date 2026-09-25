// In-run menu actions: view deck, save & quit, abandon.
import { clearRun } from '../../settings.js';
import { defineActions } from '../actions.js';
import { toTitle } from '../flow.js';
import { openModal, sortedDeck, viewCards } from '../modal.js';
import { ui } from '../state.js';

defineActions({
  'view-deck': () => viewCards('Your deck', `${ui.run.deck.length} cards`, sortedDeck(ui.run.deck)),
  abandon: () =>
    openModal(
      () =>
        '<h2>Leave this run?</h2><div class="dim">Progress is saved automatically at the map. Abandoning deletes the save.</div>' +
        '<div class="modal-actions"><button class="ds-btn gray" data-act="save-quit">SAVE &amp; QUIT</button>' +
        '<button class="ds-btn red" data-act="abandon-yes">ABANDON</button><button class="ds-btn blue" data-act="close-modal">KEEP PLAYING</button></div>',
    ),
  'save-quit': toTitle,
  'abandon-yes': () => {
    clearRun();
    toTitle();
  },
});
