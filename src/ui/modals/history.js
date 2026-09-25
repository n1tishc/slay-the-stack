// Run history: the last 30 runs with result, killer and seed.
import { CHARACTERS } from '../../game/data/characters.js';
import { MODES } from '../../game/data/modes.js';
import { esc } from '../../lib/html.js';
import { loadHistory } from '../../settings.js';
import { defineActions } from '../actions.js';
import { openModal } from '../modal.js';

function body() {
  const hist = loadHistory();
  const rows = hist
    .map((h) => {
      const c = CHARACTERS[h.char];
      return (
        `<tr><td>${h.date}</td><td style="color:${c.color}">${c.name}${h.mode && h.mode !== 'standard' ? ` <small class="dim">${MODES[h.mode].name}</small>` : ''}</td><td class="${h.win ? 'win' : 'lose'}">${h.win ? 'WIN' : 'LOSS'}</td>` +
        `<td>FL ${h.floor}</td><td>${h.killer ? esc(h.killer) : '—'}</td><td>${h.bugs}</td><td class="dim">${h.seed}</td></tr>`
      );
    })
    .join('');
  const wins = hist.filter((h) => h.win).length;
  return (
    '<button class="pill close-x" data-act="close-modal">✕</button><h2>Run History</h2>' +
    `<div class="dim">${hist.length} runs · ${wins} wins</div>` +
    '<table class="map-table hist"><tr><th>Date</th><th>Model</th><th>Result</th><th>Reached</th><th>Taken down by</th><th>Bugs</th><th>Seed</th></tr>' +
    rows +
    '</table><div class="modal-actions"><button class="ds-btn red" data-act="close-modal">CLOSE</button></div>'
  );
}

defineActions({
  history: () => openModal(body),
});
