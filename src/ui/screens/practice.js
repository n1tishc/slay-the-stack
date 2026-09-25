// Practice: the Slack scenarios on their own, outside a run. No rewards and no HP at stake.
// Missed calls come first, then scenarios never tried, then the rest. Answers still count:
// a best call here takes a scenario off the list of calls to revisit.
import { RNG } from '../../game/core/rng.js';
import { EVENTS } from '../../game/data/events.js';
import { esc } from '../../lib/html.js';
import { loadCalls, markGuide, recordCall } from '../../settings.js';
import { room, showScene } from '../../stage/index.js';
import { defineActions } from '../actions.js';
import { choice } from '../components/choice.js';
import { say } from '../msgbox.js';
import { render } from '../render.js';
import { ui } from '../state.js';
import { VERDICT, message, verdict } from './event.js';

export function toPractice() {
  const past = loadCalls();
  const rng = new RNG(Date.now() >>> 0);
  const group = (fn) => rng.shuffle(EVENTS.filter(fn)).map((e) => e.id);
  const queue = [
    ...group((e) => past[e.id] && past[e.id] !== 'best'),
    ...group((e) => !past[e.id]),
    ...group((e) => past[e.id] === 'best'),
  ];
  ui.practice = { queue, i: -1, answered: 0, best: 0, rng };
  ui.screen = 'practice';
  next();
}

function next() {
  const p = ui.practice;
  p.i++;
  ui.eventResult = null;
  if (p.i >= p.queue.length) {
    ui.event = null;
    ui.sc = showScene(room, { theme: 'win', icon: '🏆', extras: ['🎉', '✨'], charId: ui.focusChar });
    say(`That’s all ${p.queue.length} scenarios. ${p.best} best calls.`);
    render();
    return;
  }
  const ev = EVENTS.find((e) => e.id === p.queue[p.i]);
  const past = loadCalls()[ev.id];
  ui.event = ev;
  ui.eventRetry = !!past && past !== 'best';
  ui.eventOrder = p.rng.shuffle(ev.options.map((o, i) => i));
  ui.sc = showScene(room, { theme: 'event', icon: ev.icon, extras: ['💬'], charId: ui.focusChar });
  say(`${ui.eventRetry ? 'You missed this one before. ' : ''}Practice: no rewards and no HP at stake. What would you do?`);
  render();
}

function summary(p) {
  return (
    '<div class="room-bottom scenario practice-done"><div class="room-title">PRACTICE COMPLETE</div>' +
    `<p class="rc-note">You answered all ${p.queue.length} scenarios: ${p.best} best calls. Missed ones come back first next time, and in your runs.</p>` +
    '<div class="room-actions"><button class="ds-btn blue" data-act="practice">GO AGAIN</button>' +
    '<button class="ds-btn red" data-act="to-title">BACK TO TITLE</button></div></div>'
  );
}

export function bottom() {
  const p = ui.practice;
  const ev = ui.event;
  if (!ev) return summary(p);
  const r = ui.eventResult;
  let body;
  if (r) {
    const last = p.i === p.queue.length - 1;
    body = verdict(ev, r, `<button class="ds-btn blue" data-act="practice-next">${last ? 'FINISH' : 'NEXT'} ▶</button>`);
  } else {
    const opts = ui.eventOrder.map((i, n) =>
      choice('practice-opt', String.fromCharCode(65 + n), ev.options[i].label, '', false, false, ` data-i="${i}"`),
    );
    body = `<div class="sl-q">What would you do?</div><div class="choices one">${opts.join('')}</div>`;
  }
  const retry = ui.eventRetry ? '<span class="pm-new">RETRY</span>' : '';
  return (
    '<div class="room-bottom scenario">' +
    `<div class="room-title"><button class="pill" data-act="to-title">◀ BACK</button>` +
    `PRACTICE ${p.i + 1}/${p.queue.length} · ${esc(ev.title.toUpperCase())}${retry}</div>` +
    `${message(ev)}${body}</div>`
  );
}

defineActions({
  'practice-opt': (d) => {
    if (ui.eventResult) return;
    const ev = ui.event;
    const opt = ev.options[+d.i];
    const best = ev.options.find((o) => o.grade === 'best').label;
    if (ev.failure) markGuide([ev.failure]);
    recordCall(ev.id, opt.grade);
    ui.practice.answered++;
    if (opt.grade === 'best') ui.practice.best++;
    ui.eventResult = { grade: opt.grade, why: opt.why, best, label: opt.label, lines: [] };
    say(`${VERDICT[opt.grade].say} ${opt.grade === 'best' ? 'That’s the call.' : 'Read why, then try the next one.'}`);
    if (opt.grade === 'best') ui.sc?.celebrate?.();
    render();
  },
  'practice-next': next,
});
