// GPT (OpenAI): Tool Call swarms, draw and scaling.

export const GPT_CARDS = [
  {
    id: 'gp_complete', name: 'Complete', char: 'gpt', type: 'attack', rarity: 'basic', icon: '⌨️',
    cost: 1, tok: 2, v: { dmg: 6 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'gp_moderate', name: 'Moderation', char: 'gpt', type: 'skill', rarity: 'basic', icon: '🛡️',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 8 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'gp_funccall', name: 'Function Call', char: 'gpt', type: 'skill', rarity: 'basic', icon: '📞',
    cost: 1, tok: 2, v: { n: 2 }, upg: { v: { n: 3 } },
    desc: function (v) { return 'Add ' + v.n + ' Tool Calls to your hand.'; },
    play: function (c, v) { c.addToHand('toolcall', v.n); },
  },
  {
    id: 'gp_stream', name: 'Stream', char: 'gpt', type: 'attack', rarity: 'common', icon: '🌊',
    cost: 1, tok: 2, v: { dmg: 3 }, upg: { v: { dmg: 4 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage 3 times.'; },
    play: function (c, v, t) { for (var i = 0; i < 3 && c.alive(t); i++) c.attack(t, v.dmg); },
  },
  {
    id: 'gp_browse', name: 'Browse', char: 'gpt', type: 'skill', rarity: 'common', icon: '🌐',
    cost: 1, tok: 2, v: { dr: 2 }, upg: { v: { dr: 3 } },
    desc: function (v) { return 'Draw ' + v.dr + ' cards.'; },
    play: function (c, v) { c.draw(v.dr); },
  },
  {
    id: 'gp_interp', name: 'Code Interpreter', char: 'gpt', type: 'skill', rarity: 'common', icon: '🐍',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'Add ' + v.n + ' Tool Calls to your hand.'; },
    play: function (c, v) { c.addToHand('toolcall', v.n); },
  },
  {
    id: 'gp_temp0', name: 'Temperature 0', char: 'gpt', type: 'skill', rarity: 'common', icon: '🧊',
    cost: 1, tok: 1, v: { blk: 8 }, upg: { v: { blk: 11 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'gp_confident', name: 'Confident Answer', char: 'gpt', type: 'attack', rarity: 'common', icon: '😎',
    cost: 0, tok: 2, v: { dmg: 7 }, upg: { v: { dmg: 10 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Shuffle a Hallucination into your draw pile.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.addToDraw('hallucination', 1); },
  },
  {
    id: 'gp_fewshot', name: 'Few-Shot', char: 'gpt', type: 'attack', rarity: 'common', icon: '🎯',
    cost: 1, tok: 2, v: { dmg: 4 }, upg: { v: { dmg: 5 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage twice. Apply 1 Exposed.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); if (c.alive(t)) c.attack(t, v.dmg); c.apply(t, 'exposed', 1); },
  },
  {
    id: 'gp_sysprompt', name: 'System Prompt', char: 'gpt', type: 'skill', rarity: 'common', icon: '⚙️',
    cost: 0, tok: 1, v: { blk: 3 }, upg: { v: { blk: 5 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Draw 1 card.'; },
    play: function (c, v) { c.guard(v.blk); c.draw(1); },
  },
  {
    id: 'gp_newchat', name: 'New Chat', char: 'gpt', type: 'skill', rarity: 'common', icon: '🆕',
    cost: 1, tok: 0, exhaust: true, upg: { cost: 0 },
    desc: function () { return 'Set your Context to 0. Exhaust.'; },
    play: function (c) { c.setContext(0); },
  },
  {
    id: 'gp_parallel', name: 'Parallel Tool Calls', char: 'gpt', type: 'power', rarity: 'uncommon', icon: '🔀',
    cost: 1, tok: 2, v: { n: 2 }, upg: { v: { n: 3 } },
    desc: function (v) { return 'Tool Calls deal ' + v.n + ' more damage.'; },
    play: function (c, v) { c.selfApply('parallel', v.n); },
  },
  {
    id: 'gp_moe', name: 'Mixture of Experts', char: 'gpt', type: 'attack', rarity: 'uncommon', icon: '🎲', target: 'random',
    cost: 2, tok: 3, v: { dmg: 4 }, upg: { v: { dmg: 5 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage to a random enemy 5 times.'; },
    play: function (c, v) {
      for (var i = 0; i < 5; i++) {
        var t = c.randomEnemy();
        if (!t) break;
        c.attack(t, v.dmg);
      }
    },
  },
  {
    id: 'gp_rlhf', name: 'RLHF', char: 'gpt', type: 'power', rarity: 'uncommon', icon: '👍',
    cost: 1, tok: 2, v: { n: 2 }, upg: { v: { n: 3 } },
    desc: function (v) { return 'Gain ' + v.n + ' Weights.'; },
    play: function (c, v) { c.selfApply('weights', v.n); },
  },
  {
    id: 'gp_swarm', name: 'Agent Swarm', char: 'gpt', type: 'skill', rarity: 'uncommon', icon: '🐝',
    cost: 2, tok: 3, exhaust: true, upg: { cost: 1 },
    desc: function () { return 'Add 5 Tool Calls to your hand. Exhaust.'; },
    play: function (c) { c.addToHand('toolcall', 5); },
  },
  {
    id: 'gp_refusal', name: 'Refusal Training', char: 'gpt', type: 'skill', rarity: 'uncommon', icon: '🚫',
    cost: 1, tok: 2, v: { blk: 9 }, upg: { v: { blk: 12 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Draw 1 card.'; },
    play: function (c, v) { c.guard(v.blk); c.draw(1); },
  },
  {
    id: 'gp_batch', name: 'Batch API', char: 'gpt', type: 'attack', rarity: 'uncommon', icon: '📦', target: 'all',
    cost: 1, tok: 2, v: { dmg: 5 }, upg: { v: { dmg: 7 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage to ALL enemies. Add a Tool Call to your hand.'; },
    play: function (c, v) { c.attackAll(v.dmg); c.addToHand('toolcall', 1); },
  },
  {
    id: 'gp_reasoning', name: 'Reasoning Effort: High', char: 'gpt', type: 'power', rarity: 'rare', icon: '🧮',
    cost: 2, tok: 3, upg: { cost: 1 },
    desc: function () { return 'At the start of your turn, add a Tool Call to your hand and draw 1 card.'; },
    play: function (c) { c.selfApply('reasoning', 1); },
  },
  {
    id: 'gp_scaling', name: 'Scaling Laws', char: 'gpt', type: 'attack', rarity: 'rare', icon: '📈',
    cost: 1, tok: 2, v: { per: 3 }, upg: { v: { per: 4 } },
    desc: function (v, fx) {
      var n = fx.cardsPlayed() + 1;
      return 'Deal ' + v.per + ' damage per card played this turn, including this one' + fx.paren(fx.d(v.per * n)) + '.';
    },
    play: function (c, v, t) { c.attack(t, v.per * c.cardsPlayedTurn); },
  },
  {
    id: 'gp_launch', name: 'Launch Event', char: 'gpt', type: 'attack', rarity: 'rare', icon: '🚀',
    cost: 3, tok: 5, exhaust: true, v: { dmg: 30 }, upg: { v: { dmg: 40 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Exhaust.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
];
