// End of run: victory or defeat, a few stats, and a recap of what the run taught: the failure
// modes met (each opens its Field Guide entry) and the scenario calls worth another look.
import { iconImg } from '../../art/icons.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { EVENTS } from '../../game/data/events.js';
import { MODES } from '../../game/data/modes.js';
import { esc, rich } from '../../lib/html.js';
import { ui } from '../state.js';

const GRADE = { ok: 'RISKY CALL', bad: 'BAD CALL' };

function recap(run) {
  const met = (run.met || []).map((id) => {
    const def = ENEMIES[id];
    const tag = run.found?.includes(id) ? '<span class="pm-new">NEW</span>' : '';
    return `<button class="rc-chip" data-act="field-guide" data-id="${id}">${iconImg(def.icon, '', 20)}<span>${esc(def.name)}</span>${tag}</button>`;
  });
  const calls = (run.calls || []).filter((c) => EVENTS.some((e) => e.id === c.id));
  const missed = calls
    .filter((c) => c.grade !== 'best')
    .map((c) => {
      const ev = EVENTS.find((e) => e.id === c.id);
      const best = ev.options.find((o) => o.grade === 'best').label;
      return (
        `<div class="rc-call"><div><b>${esc(ev.title)}</b><span class="rc-grade ${c.grade}">${GRADE[c.grade]}</span></div>` +
        `<p>Best call: ${rich(best)}</p></div>`
      );
    });
  let callsHtml = '';
  if (missed.length) {
    callsHtml = `<div class="pm-h">CALLS TO REVISIT</div>${missed.join('')}<p class="rc-note">You’ll get another try at these in later runs.</p>`;
  } else if (calls.length) {
    callsHtml = `<div class="pm-h">YOUR CALLS</div><p class="rc-note">All ${calls.length} of your calls this run were the best call.</p>`;
  }
  if (!met.length && !callsHtml) return '';
  return (
    '<div class="postmortem recap">' +
    (met.length
      ? `<div class="pm-h">FAILURE MODES YOU MET · OPEN ONE FOR ITS LESSON</div><div class="rc-chips">${met.join('')}</div>`
      : '') +
    callsHtml +
    '</div>'
  );
}

export function bottom() {
  const o = ui.over;
  const run = ui.run;
  const s = run.stats;
  const mode = MODES[run.mode] || MODES.standard;
  const box = (n, label) => `<div class="stat-box"><b>${n}</b><span>${label}</span></div>`;
  return (
    `<div class="room-bottom over"><div class="result-title ${o.win ? 'win' : 'lose'}">${o.win ? 'INCIDENT RESOLVED' : 'SERVICE DOWN'}</div>` +
    `<div class="over-mode">${esc(mode.name)} mode${o.unlocked ? ' · <b>Hard mode unlocked!</b>' : ''}</div>` +
    `<div class="stats-grid">${box(o.floor, 'floors')}${box(s.bugsFixed, 'bugs fixed')}${box(s.hallucinations, 'hallucinations')}${box(run.deck.length, 'cards')}` +
    `${s.calls ? box(`${s.bestCalls}/${s.calls}`, 'best calls') : ''}</div>` +
    recap(run) +
    `<div class="dim small">seed ${run.seed}</div>` +
    '<div class="room-actions"><button class="ds-btn red" data-act="to-title">BACK TO TITLE</button></div></div>'
  );
}
