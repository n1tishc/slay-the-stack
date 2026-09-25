// Turn the engine's fx events into stage animations, floating numbers and messages.
import { esc, firstSentence } from '../../lib/html.js';
import { scaled, settings } from '../../settings.js';
import { flash, float, floatLayer, glitch, shake } from '../../stage/index.js';
import { STATUS } from '../components/status.js';
import { character } from '../flow.js';
import { say } from '../msgbox.js';
import { ui } from '../state.js';

const anchorKey = (t) => (t === 'player' ? 'player' : `e:${t}`);

function enemyName(uid) {
  return ui.c?.enemyByUid(uid)?.name ?? 'The bug';
}

export function banner(text, sub, cls = '') {
  const d = document.createElement('div');
  d.className = `banner ${cls}`;
  d.innerHTML = `<div class="bt">${esc(text)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}`;
  floatLayer().appendChild(d);
  setTimeout(() => d.remove(), 1700);
}

// A played card flies from the hand toward the top screen.
export function castGhost(el) {
  if (!el || settings.reducedMotion) return;
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.classList.remove('deal', 'selected');
  ghost.classList.add('cast-ghost');
  Object.assign(ghost.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    rotate: '0deg',
    translate: 'none',
    scale: '1',
  });
  document.body.appendChild(ghost);
  setTimeout(() => ghost.remove(), 420);
}

export function playFx(list) {
  const sc = ui.sc;
  if (!sc?.hit) return;
  let actor = null;
  const perTarget = {};
  const name = character().name;
  list.forEach((f, idx) => {
    const key = f.target !== undefined ? String(f.target) : 'x';
    const n = (perTarget[key] = (perTarget[key] || 0) + 1);
    const delay = (n - 1) * 110;
    switch (f.kind) {
      case 'play': {
        actor = 'player';
        say(`${name} used ${f.card}!`);
        if (f.type === 'attack') {
          const tgt = list.slice(idx + 1).find((x) => x.kind === 'dmg' && x.target !== 'player');
          sc.lunge('player', tgt ? tgt.target : null);
        } else {
          sc.buff('player', true);
        }
        break;
      }
      case 'enemyMove':
        actor = f.target;
        if (f.intent === 'caught') {
          say(`${enemyName(f.target)} was countered and does nothing this turn.`);
          break;
        }
        say(`${enemyName(f.target)} used ${f.name}!`);
        if (f.intent?.startsWith('attack')) sc.lunge(f.target, 'player');
        break;
      case 'dmg': {
        const ak = anchorKey(f.target);
        setTimeout(() => sc.hit(f.target, f.amount), scaled(100 + delay));
        const dmgCls = f.poison ? 'poison' : f.target === 'player' ? 'dmg-p' : f.amount >= 15 ? 'dmg big' : 'dmg';
        if (f.amount > 0) float(ak, `-${f.amount}`, dmgCls, 100 + delay);
        else if (f.blocked > 0) float(ak, 'BLOCKED', 'blocked', 100 + delay);
        break;
      }
      case 'block':
        sc.guard(f.target);
        float(anchorKey(f.target), `+${f.amount} GUARD`, 'block', delay);
        break;
      case 'heal':
        if (f.amount > 0) float('player', `+${f.amount}`, 'heal', delay);
        break;
      case 'status': {
        const s = STATUS[f.status];
        if (!s) break;
        float(anchorKey(f.target), `${s.name} +${f.amount}`, 'status', delay + 160);
        sc.buff(f.target, s.type === 'buff');
        break;
      }
      case 'death':
        if (f.escaped) sc.escape?.(f.target);
        else setTimeout(() => sc.faint(f.target), scaled(260));
        break;
      case 'counter': {
        const def = ui.c?.enemyByUid(f.target)?.def;
        float(anchorKey(f.target), 'COUNTERED!', 'status', delay + 200);
        sc.buff(f.target, false);
        banner('COUNTERED', `${f.card} beats ${def?.name ?? 'it'}`, 'good');
        if (def?.lesson) say(`${f.card} countered ${def.name}! In real life: ${firstSentence(def.lesson.fix)}`);
        break;
      }
      case 'escape':
        float(anchorKey(f.target), 'ESCAPED!', 'bad', 0);
        say(`${enemyName(f.target)} rotated out and escaped!`);
        break;
      case 'credits':
        float('player', `${f.amount > 0 ? '+' : ''}${f.amount} ◈`, 'credits', delay + 120);
        break;
      case 'encrypt':
        sc.buff('player', false);
        float('player', `🔒 ${f.amount} CARDS ENCRYPTED`, 'bad', delay + 200);
        break;
      case 'purge':
        float('player', `rm -rf: ${f.amount} cards deleted`, 'bad', delay + 200);
        break;
      case 'context':
        sc.inject(actor && actor !== 'player' ? actor : null);
        float('player', `+${f.amount} TOKENS`, 'ctx', 350);
        break;
      case 'banner':
        if (f.text === 'CONTEXT OVERFLOW') {
          glitch();
          shake(0.3);
          say(`${name}’s context overflowed! ${name} is hallucinating…`);
          banner('CONTEXT OVERFLOW', 'Compute lost · Hallucination added', 'bad');
        } else if (f.bad) {
          flash('rgba(255,40,60,.55)');
          shake(0.4);
          say(`${f.text}! ${f.sub}.`);
          banner(f.text, f.sub, 'bad');
        } else {
          flash('rgba(255,255,255,.6)');
          banner(f.text, f.sub, 'good');
        }
        break;
      default:
        break;
    }
  });
}
