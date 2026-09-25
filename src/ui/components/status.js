// Status effects (buffs/debuffs) shown as small icon chips.
import { iconImg } from '../../art/icons.js';
import { attr } from '../../lib/html.js';

export const STATUS = {
  weights: { icon: '💪', name: 'Weights', type: 'buff', tip: (n) => `+${n} attack damage per hit.` },
  robustness: { icon: '🧱', name: 'Robustness', type: 'buff', tip: (n) => `+${n} Guard from cards.` },
  exposed: { icon: '🎯', name: 'Exposed', type: 'debuff', tip: (n) => `Takes 50% more attack damage. ${n} turn(s).` },
  throttled: { icon: '🐌', name: 'Throttled', type: 'debuff', tip: (n) => `Deals 25% less attack damage. ${n} turn(s).` },
  brittle: { icon: '🥀', name: 'Brittle', type: 'debuff', tip: (n) => `Gains 25% less Guard from cards. ${n} turn(s).` },
  hotpatch: {
    icon: '🩹',
    name: 'Hotpatch',
    type: 'debuff',
    tip: (n) => `Loses ${n} HP at the start of its turn, then Hotpatch decreases by 1.`,
  },
  thought: { icon: '💭', name: 'Thought', type: 'buff', tip: (n) => `${n} Thought, ready to spend.` },
  pushback: {
    icon: '🌵',
    name: 'Pushback',
    type: 'buff',
    tip: (n) => `When attacked, deal ${n} damage back. Removed at the start of your turn.`,
  },
  principles: { icon: '📜', name: 'Principles', type: 'buff', tip: (n) => `When attacked, deal ${n} damage back. Permanent.` },
  helpful: { icon: '🤝', name: 'Helpful', type: 'buff', tip: (n) => `At the start of your turn, gain ${n} Thought.` },
  persist: { icon: '🧠', name: 'Persistent Memory', type: 'buff', tip: () => 'Guard is not removed at the start of your turn.' },
  parallel: { icon: '🔀', name: 'Parallel Tool Calls', type: 'buff', tip: (n) => `Tool Calls deal ${n} more damage.` },
  reasoning: {
    icon: '🧮',
    name: 'Reasoning Effort: High',
    type: 'buff',
    tip: (n) => `At the start of your turn, add ${n} Tool Call(s) and draw ${n}.`,
  },
  caching: { icon: '🗃️', name: 'Context Caching', type: 'buff', tip: (n) => `At the end of your turn, reduce Context by ${n}.` },
  deepthink: { icon: '🧬', name: 'Deep Think', type: 'buff', tip: (n) => `At the start of your turn, apply ${n} Hotpatch to ALL enemies.` },
  opensrc: { icon: '🌍', name: 'Open Source', type: 'buff', tip: (n) => `Whenever you play a Fork, deal ${n} damage to a random enemy.` },
  ecosystem: {
    icon: '🌱',
    name: 'Ecosystem',
    type: 'buff',
    tip: (n) => `At the start of your turn, add ${n} Fork(s) of random cards in your hand.`,
  },
  license: {
    icon: '📃',
    name: 'Permissive License',
    type: 'buff',
    tip: () => 'Forks you create are Fine-tuned. Whenever you play a Fork, draw 1 card.',
  },
  shared: { icon: '🧰', name: 'Shared Expert', type: 'buff', tip: (n) => `Whenever you play a Switch, gain ${n} Guard.` },
  gating: {
    icon: '🚦',
    name: 'Gating Network',
    type: 'buff',
    tip: (n) => `Whenever you play a Switch, deal ${n} damage to a random enemy.`,
  },
  allexperts: { icon: '🎛️', name: '256 Experts', type: 'buff', tip: () => 'Every Attack and Skill you play is a Switch.' },
  freetok: { icon: '📉', name: 'Efficiency Shock', type: 'buff', tip: () => 'Your cards add 0 tokens for the rest of this turn.' },
};

export function statuses(status) {
  const out = Object.entries(status)
    .filter(([k, n]) => n && STATUS[k])
    .map(([k, n]) => {
      const s = STATUS[k];
      return `<span class="st ${s.type}" data-tip="${attr(`<b>${s.name}</b><br>${s.tip(n)}`)}">${iconImg(s.icon, 'st-ico', 16)}${n}</span>`;
    });
  return `<div class="statuses">${out.join('')}</div>`;
}
