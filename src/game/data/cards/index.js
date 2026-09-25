// Card definitions. `v` holds the base numbers and `upg` holds overrides after Fine-tuning.
// play(c, v, t): c = Combat, v = resolved values, t = target enemy (or null).
// desc(v, fx): fx.d(n) and fx.b(n) format damage/guard with live modifiers.
import { uid } from '../../core/ids.js';

import { SHARED_CARDS } from './shared.js';
import { CLAUDE_CARDS } from './claude.js';
// Not gpt.js: ad blockers block that filename (Google's ad tag), which breaks the dev server.
import { GPT_CARDS } from './gpt-cards.js';
import { GEMINI_CARDS } from './gemini.js';
import { LLAMA_CARDS } from './llama.js';
import { DEEPSEEK_CARDS } from './deepseek.js';
import { PRACTICE_CARDS } from './practices.js';

export const CARDS = {};
function card(def) {
  def.v = def.v || {};
  def.upg = def.upg || {};
  def.target = def.target || (def.type === 'attack' ? 'enemy' : 'self');
  CARDS[def.id] = def;
}
[SHARED_CARDS, CLAUDE_CARDS, GPT_CARDS, GEMINI_CARDS, LLAMA_CARDS, DEEPSEEK_CARDS, PRACTICE_CARDS].forEach(function (list) {
  list.forEach(card);
});

// Resolved view of a card instance {uid, id, up}.
export const cardView = function (inst) {
  var d = CARDS[inst.id];
  var up = !!inst.up;
  var v = {};
  var k;
  for (k in d.v) v[k] = d.v[k];
  if (up && d.upg.v) for (k in d.upg.v) v[k] = d.upg.v[k];
  return {
    def: d,
    inst: inst,
    id: d.id,
    name: d.name + (up ? '+' : ''),
    up: up,
    type: d.type,
    rarity: d.rarity,
    icon: d.icon,
    // Encrypted cards (Ransomware) cost 1 more until played; Forks (Llama) cost 1 less.
    cost: Math.max(0, (up && d.upg.cost !== undefined ? d.upg.cost : d.cost) + (inst.enc ? 1 : 0) - (inst.fork ? 1 : 0)),
    encrypted: !!inst.enc,
    tok: up && d.upg.tok !== undefined ? d.upg.tok : d.tok,
    // A Fork (Llama) is a cheaper, Ethereal copy that Exhausts when played.
    fork: !!inst.fork,
    exhaust: !!inst.fork || (up && d.upg.exhaust !== undefined ? d.upg.exhaust : !!d.exhaust),
    ethereal: !!d.ethereal || !!inst.fork,
    unplayable: !!d.unplayable,
    target: d.target,
    v: v,
  };
};

export const newCard = function (id, up) {
  return { uid: uid(), id: id, up: !!up };
};

export const canUpgrade = function (inst) {
  var d = CARDS[inst.id];
  return !inst.up && d.type !== 'status' && d.type !== 'curse';
};

// Reward-eligible cards for a character (never statuses, curses or generated tokens).
export const cardPool = function (charId, rarity) {
  var out = [];
  for (var id in CARDS) {
    var d = CARDS[id];
    if (d.char === charId && d.rarity === rarity) out.push(id);
  }
  return out;
};
