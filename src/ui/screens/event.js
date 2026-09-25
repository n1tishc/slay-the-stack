// Slack threads: a "what would you do?" scenario. The answers are shown without their outcomes;
// after the pick, the verdict, the reason, the best call and the reward are revealed.
import { iconImg } from '../../art/icons.js';
import { Run } from '../../game/engine/run.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { esc, rich } from '../../lib/html.js';
import { markGuide, recordCall } from '../../settings.js';
import { defineActions } from '../actions.js';
import { choice } from '../components/choice.js';
import { chooseUpgrade } from '../modal.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';

export const strip = true;

export const VERDICT = {
  best: { icon: '✅', title: 'BEST CALL', say: 'Best call!' },
  ok: { icon: '⚠️', title: 'RISKY CALL', say: 'Risky call:' },
  bad: { icon: '❌', title: 'BAD CALL', say: 'Bad call:' },
};

export function message(ev) {
  return (
    `<div class="slack">${iconImg(ev.icon, 'sl-av', 32)}<div class="sl-body">` +
    `<div class="sl-from"><b>${esc(ev.from)}</b><small>just now</small></div>` +
    `<p>${rich(ev.body)}</p>${ev.note ? `<p class="sl-note">${rich(ev.note)}</p>` : ''}</div></div>`
  );
}

// `next` replaces the run's reward line and CONTINUE button (Practice passes its own).
export function verdict(ev, r, next) {
  const v = VERDICT[r.grade];
  const failure = ev.failure ? ENEMIES[ev.failure] : null;
  const guide = failure
    ? `<button class="pm-link" data-act="field-guide" data-id="${failure.id}">Field Guide: ${esc(failure.name)} ›</button>`
    : '';
  return (
    `<div class="verdict ${r.grade}"><div class="vd-head">${iconImg(v.icon, '', 20)}<b>${v.title}</b>` +
    `<span class="vd-picked">You picked: ${rich(r.label)}</span></div>` +
    `<p>${rich(r.why)}</p>` +
    (r.grade === 'best' ? '' : `<p class="vd-best"><b>Best call:</b> ${rich(r.best)}</p>`) +
    (next !== undefined
      ? `<div class="vd-foot">${guide}${next}`
      : `<div class="vd-foot"><span class="vd-reward">${r.lines.map(esc).join(' · ')}</span>${guide}` +
        (r.pending ? '' : '<button class="ds-btn blue" data-act="to-map">CONTINUE ▶</button>')) +
    '</div></div>'
  );
}

export function bottom() {
  const ev = ui.event;
  const r = ui.eventResult;
  let body;
  if (r) {
    body = verdict(ev, r);
  } else {
    const order = ui.eventOrder || ev.options.map((o, i) => i);
    const opts = order.map((i, n) =>
      choice('event-opt', String.fromCharCode(65 + n), ev.options[i].label, '', false, false, ` data-i="${i}"`),
    );
    body = `<div class="sl-q">What would you do?</div><div class="choices one">${opts.join('')}</div>`;
  }
  const retry = ui.eventRetry ? '<span class="pm-new">RETRY</span>' : '';
  return `<div class="room-bottom scenario"><div class="room-title">#ENG-GENERAL · ${esc(ev.title.toUpperCase())}${retry}</div>${message(ev)}${body}</div>`;
}

defineActions({
  'event-opt': (d) => {
    if (ui.eventResult) return;
    const ev = ui.event;
    const res = Run.answerScenario(ui.run, ev, +d.i);
    if (ev.failure) Run.meet(ui.run, [ev.failure], markGuide([ev.failure]));
    recordCall(ev.id, res.grade);
    ui.eventResult = { ...res, label: ev.options[+d.i].label, pending: !!res.action };
    // The panel explains the call; the message box just says what it earned.
    say(`${VERDICT[res.grade].say} ${res.lines.join(' · ')}`);
    if (res.grade === 'best') ui.sc?.celebrate?.();
    render();
    if (!res.action) return;
    // The reward is a card upgrade: mandatory, like any other paid-for choice.
    chooseUpgrade(() => {
      ui.eventResult.pending = false;
      render();
    }, true);
  },
});
