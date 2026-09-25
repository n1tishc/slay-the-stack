// How to Play: the Context twist, controls, the Slay the Spire mapping and the glossary.
import { KEYWORDS, MAPPING } from '../../game/core/glossary.js';
import { esc } from '../../lib/html.js';
import { defineActions } from '../actions.js';
import { openModal } from '../modal.js';

function body() {
  const rows = MAPPING.map(
    (m, i) => `<tr${i === MAPPING.length - 1 ? ' class="twist"' : ''}><td>${esc(m[0])}</td><td>${esc(m[1])}</td></tr>`,
  ).join('');
  const gloss = Object.entries(KEYWORDS)
    .map(([k, v]) => `<div><b>${k}</b>${v}</div>`)
    .join('');
  return (
    '<button class="pill close-x" data-act="close-modal">✕</button>' +
    '<div class="howto"><h2>How to Play</h2>' +
    '<p>Production is on fire. Pick a frontier model, climb the Legacy Monolith one floor at a time, beat the ways coding agents go wrong, and resolve the <b>SEV-0</b> waiting at the top.</p>' +
    '<h3>The twist: your Context window</h3><ul>' +
    '<li>Every card shows a <b class="ctx-c">+Nt</b> token badge. Playing it adds those tokens to your <b>Context</b>, which carries over between turns within a combat.</li>' +
    '<li>Tokens are added <i>before</i> the card resolves. Fill Context past the <b class="deep-c">DEEP</b> mark and your attacks deal <b>+50% damage</b>.</li>' +
    '<li>If Context goes above its max after a card resolves, you <b class="bad-c">Overflow</b> and Hallucinate: Context resets to 0, you lose all remaining Compute, and a Hallucination card clogs your deck.</li>' +
    '<li>Hover a card to preview the meter. A red token badge means that card would Overflow.</li>' +
    '<li>Watch for bugs that <b>inject</b> tokens into your Context (📥).</li></ul>' +
    '<h3>Learn as you play: failure modes and Practices</h3><ul>' +
    '<li>Every common enemy is a real way coding agents go wrong, from made-up APIs to prompt injection. Fights start with beginner mistakes and work up to security problems.</li>' +
    '<li>Each one is weak to a <b>Practice</b>: the real habit that prevents it. Hover an enemy to see its weakness. Playing that card <b>Counters</b> it: its next move is cancelled and it becomes Exposed.</li>' +
    '<li>You start with <b>/compact</b>, which Counters Context Rot. After each fight, the postmortem explains the real-world fix and offers the Practice for each failure you met.</li>' +
    '<li>The <b>Field Guide</b> on the title screen keeps every failure mode you have found, with what it looks like, why it happens and what to do.</li></ul>' +
    '<h3>Controls</h3><ul><li>Click a card to play it; targeted cards then need an enemy (click its sprite or nameplate). <b>1–0</b> select cards, <b>E</b> ends the turn, <b>Esc</b> cancels.</li>' +
    '<li>On the map, click a glowing stop on either screen. Scroll or drag the top screen to look ahead.</li>' +
    '<li>The player box shows <b>incoming damage</b> after your Guard, so you know how much to defend.</li></ul>' +
    `<h3>Slay the Spire → Slay the Stack</h3><table class="map-table">${rows}</table>` +
    `<h3>Glossary</h3><div class="gloss">${gloss}</div>` +
    '<div class="modal-actions"><button class="ds-btn red" data-act="close-modal">GOT IT</button></div></div>'
  );
}

defineActions({
  howto: () => openModal(body),
});
