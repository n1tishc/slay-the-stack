// DeepSeek: a mixture of experts. Switch between Attacks and Skills for bonus effects, and keep
// Context lean. `c.switching` is true while a Switch resolves.

export const DEEPSEEK_CARDS = [
  {
    id: 'ds_infer', name: 'Inference', char: 'deepseek', type: 'attack', rarity: 'basic', icon: '🐋',
    cost: 1, tok: 2, v: { dmg: 6 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'ds_align', name: 'Alignment', char: 'deepseek', type: 'skill', rarity: 'basic', icon: '🛡️',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 8 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'ds_router', name: 'Router', char: 'deepseek', type: 'skill', rarity: 'basic', icon: '🧭',
    cost: 0, tok: 1, v: { blk: 3 }, upg: { v: { blk: 5 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Switch: draw 1 card.'; },
    play: function (c, v) { c.guard(v.blk); if (c.switching) c.draw(1); },
  },
  {
    id: 'ds_coder', name: 'Coder', char: 'deepseek', type: 'attack', rarity: 'common', icon: '💻',
    cost: 1, tok: 2, v: { dmg: 6, sw: 4 }, upg: { v: { dmg: 8, sw: 5 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Switch: deal ' + v.sw + ' more.'; },
    play: function (c, v, t) { c.attack(t, v.dmg + (c.switching ? v.sw : 0)); },
  },
  {
    id: 'ds_prover', name: 'Prover', char: 'deepseek', type: 'attack', rarity: 'common', icon: '📐',
    cost: 1, tok: 2, v: { dmg: 5, ex: 2 }, upg: { v: { dmg: 7, ex: 3 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Switch: apply ' + v.ex + ' Exposed first.'; },
    play: function (c, v, t) { if (c.switching) c.apply(t, 'exposed', v.ex); c.attack(t, v.dmg); },
  },
  {
    id: 'ds_think', name: 'Think Aloud', char: 'deepseek', type: 'skill', rarity: 'common', icon: '🗯️',
    cost: 1, tok: 2, v: { blk: 6, sw: 4 }, upg: { v: { blk: 8, sw: 5 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Switch: gain ' + v.sw + ' more.'; },
    play: function (c, v) { c.guard(v.blk + (c.switching ? v.sw : 0)); },
  },
  {
    id: 'ds_distill', name: 'Distill', char: 'deepseek', type: 'skill', rarity: 'common', icon: '⚗️',
    cost: 0, tok: 0, v: { red: 3, sw: 3 }, upg: { v: { red: 4, sw: 4 } },
    desc: function (v) { return 'Reduce Context by ' + v.red + '. Switch: reduce it by ' + v.sw + ' more.'; },
    play: function (c, v) { c.changeContext(-(v.red + (c.switching ? v.sw : 0))); },
  },
  {
    id: 'ds_sparse', name: 'Sparse Attention', char: 'deepseek', type: 'attack', rarity: 'common', icon: '✴️',
    cost: 1, tok: 1, v: { dmg: 3 }, upg: { v: { dmg: 4 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage twice. Switch: 3 times.'; },
    play: function (c, v, t) { for (var i = 0; i < (c.switching ? 3 : 2) && c.alive(t); i++) c.attack(t, v.dmg); },
  },
  {
    id: 'ds_cache', name: 'Latent Cache', char: 'deepseek', type: 'skill', rarity: 'common', icon: '📥',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 7 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Draw 1 card.'; },
    play: function (c, v) { c.guard(v.blk); c.draw(1); },
  },
  {
    id: 'ds_budget', name: 'Budget Run', char: 'deepseek', type: 'skill', rarity: 'common', icon: '🪙',
    cost: 1, tok: 0, v: { dr: 2 }, upg: { v: { dr: 3 } },
    desc: function (v) { return 'Draw ' + v.dr + ' cards.'; },
    play: function (c, v) { c.draw(v.dr); },
  },
  {
    id: 'ds_paper', name: 'Open Paper', char: 'deepseek', type: 'attack', rarity: 'common', icon: '📄', target: 'all',
    cost: 1, tok: 2, v: { dmg: 4 }, upg: { v: { dmg: 6 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage to ALL enemies. Switch: apply 1 Throttled to ALL.'; },
    play: function (c, v) { c.attackAll(v.dmg); if (c.switching) c.applyAll('throttled', 1); },
  },
  {
    id: 'ds_shared', name: 'Shared Expert', char: 'deepseek', type: 'power', rarity: 'uncommon', icon: '🧰',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'Whenever you play a Switch, gain ' + v.n + ' Guard.'; },
    play: function (c, v) { c.selfApply('shared', v.n); },
  },
  {
    id: 'ds_gating', name: 'Gating Network', char: 'deepseek', type: 'power', rarity: 'uncommon', icon: '🚦',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'Whenever you play a Switch, deal ' + v.n + ' damage to a random enemy.'; },
    play: function (c, v) { c.selfApply('gating', v.n); },
  },
  {
    id: 'ds_chain', name: 'Long Chain', char: 'deepseek', type: 'attack', rarity: 'uncommon', icon: '⛓️',
    cost: 2, tok: 3, v: { dmg: 8, per: 4 }, upg: { v: { dmg: 10, per: 5 } },
    desc: function (v, fx) {
      return 'Deal ' + v.dmg + ' damage, +' + v.per + ' per Switch this turn, this one included' +
        fx.paren(fx.d(v.dmg + v.per * fx.switches())) + '.';
    },
    play: function (c, v, t) { c.attack(t, v.dmg + v.per * c.switchesTurn); },
  },
  {
    id: 'ds_aha', name: 'Aha Moment', char: 'deepseek', type: 'skill', rarity: 'uncommon', icon: '💡',
    cost: 1, tok: 2, upg: { cost: 0 },
    desc: function () { return 'Draw 1 card. Switch: gain 1 Compute.'; },
    play: function (c) { c.draw(1); if (c.switching) c.gainEnergy(1); },
  },
  {
    id: 'ds_toggle', name: 'Thinking Toggle', char: 'deepseek', type: 'skill', rarity: 'uncommon', icon: '🎚️',
    cost: 0, tok: 1, v: { dr: 0 }, upg: { v: { dr: 1 } },
    desc: function (v) { return 'Your next Attack or Skill is a Switch.' + (v.dr ? ' Draw 1 card.' : ''); },
    play: function (c, v) { c.forceSwitch = true; c.draw(v.dr); },
  },
  {
    id: 'ds_reward', name: 'Reward Model', char: 'deepseek', type: 'attack', rarity: 'uncommon', icon: '🏅',
    cost: 1, tok: 2, v: { dmg: 7 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Switch: gain 1 Weights.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); if (c.switching) c.selfApply('weights', 1); },
  },
  {
    id: 'ds_experts', name: '256 Experts', char: 'deepseek', type: 'power', rarity: 'rare', icon: '🎛️',
    cost: 2, tok: 3, upg: { cost: 1 },
    desc: function () { return 'Every Attack and Skill you play is a Switch.'; },
    play: function (c) { c.selfApply('allexperts', 1); },
  },
  {
    id: 'ds_fraction', name: 'Frontier at a Fraction', char: 'deepseek', type: 'attack', rarity: 'rare', icon: '🏹',
    cost: 2, tok: 3, v: { dmg: 6 }, upg: { v: { dmg: 8 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage 3 times. Switch: 4 times.'; },
    play: function (c, v, t) { for (var i = 0; i < (c.switching ? 4 : 3) && c.alive(t); i++) c.attack(t, v.dmg); },
  },
  {
    id: 'ds_shock', name: 'Efficiency Shock', char: 'deepseek', type: 'skill', rarity: 'rare', icon: '📉',
    cost: 1, tok: 2, exhaust: true, upg: { cost: 0 },
    desc: function () { return 'Your cards add 0 tokens this turn. Draw 1 card. Exhaust.'; },
    play: function (c) { c.p.status.freetok = 1; c.draw(1); },
  },
];
