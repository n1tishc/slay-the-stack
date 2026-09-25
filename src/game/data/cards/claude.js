// Claude (Anthropic): Thought → Final Answer, Guard and Pushback.

export const CLAUDE_CARDS = [
  {
    id: 'cl_critique', name: 'Critique', char: 'claude', type: 'attack', rarity: 'basic', icon: '🖋️',
    cost: 1, tok: 2, v: { dmg: 6 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'cl_guardrail', name: 'Guardrail', char: 'claude', type: 'skill', rarity: 'basic', icon: '🛡️',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 8 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'cl_careful', name: 'Careful Analysis', char: 'claude', type: 'attack', rarity: 'basic', icon: '🔬',
    cost: 2, tok: 3, v: { dmg: 8, ex: 2 }, upg: { v: { dmg: 10, ex: 3 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Apply ' + v.ex + ' Exposed.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.apply(t, 'exposed', v.ex); },
  },
  {
    id: 'cl_cot', name: 'Chain of Thought', char: 'claude', type: 'attack', rarity: 'common', icon: '🔗',
    cost: 1, tok: 2, v: { dmg: 6, th: 1 }, upg: { v: { dmg: 8, th: 2 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Gain ' + v.th + ' Thought.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.selfApply('thought', v.th); },
  },
  {
    id: 'cl_stepbystep', name: 'Think Step by Step', char: 'claude', type: 'skill', rarity: 'common', icon: '🪜',
    cost: 1, tok: 2, v: { blk: 5, th: 2 }, upg: { v: { blk: 7, th: 3 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Gain ' + v.th + ' Thought.'; },
    play: function (c, v) { c.guard(v.blk); c.selfApply('thought', v.th); },
  },
  {
    id: 'cl_refusal', name: 'Polite Refusal', char: 'claude', type: 'skill', rarity: 'common', icon: '🙅',
    cost: 1, tok: 1, target: 'enemy', v: { blk: 7, wk: 1 }, upg: { v: { blk: 10, wk: 2 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Apply ' + v.wk + ' Throttled.'; },
    play: function (c, v, t) { c.guard(v.blk); c.apply(t, 'throttled', v.wk); },
  },
  {
    id: 'cl_honest', name: 'Honest Feedback', char: 'claude', type: 'attack', rarity: 'common', icon: '💬',
    cost: 1, tok: 3, v: { dmg: 10 }, upg: { v: { dmg: 14 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'cl_summarize', name: 'Summarize', char: 'claude', type: 'skill', rarity: 'common', icon: '📝',
    cost: 0, tok: 0, v: { red: 5 }, upg: { v: { red: 8 } },
    desc: function (v) { return 'Reduce Context by ' + v.red + '. Draw 1 card.'; },
    play: function (c, v) { c.changeContext(-v.red); c.draw(1); },
  },
  {
    id: 'cl_clarify', name: 'Clarifying Question', char: 'claude', type: 'skill', rarity: 'common', icon: '❓',
    cost: 0, tok: 1, target: 'enemy', v: { wk: 1 }, upg: { v: { wk: 2 } },
    desc: function (v) { return 'Apply ' + v.wk + ' Throttled. Draw 1 card.'; },
    play: function (c, v, t) { c.apply(t, 'throttled', v.wk); c.draw(1); },
  },
  {
    id: 'cl_harmless', name: 'Harmlessness', char: 'claude', type: 'skill', rarity: 'common', icon: '🕊️',
    cost: 1, tok: 1, v: { blk: 6, pb: 3 }, upg: { v: { blk: 8, pb: 5 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Gain ' + v.pb + ' Pushback.'; },
    play: function (c, v) { c.guard(v.blk); c.selfApply('pushback', v.pb); },
  },
  {
    id: 'cl_final', name: 'Final Answer', char: 'claude', type: 'attack', rarity: 'uncommon', icon: '🎯',
    cost: 2, tok: 3, v: { dmg: 8, per: 4 }, upg: { v: { dmg: 10, per: 5 } },
    desc: function (v, fx) {
      return 'Deal ' + v.dmg + ' damage, +' + v.per + ' per Thought' + fx.paren(fx.d(v.dmg + v.per * fx.status('thought'))) + '. Spend all Thought.';
    },
    play: function (c, v, t) { var th = c.ps('thought'); c.attack(t, v.dmg + v.per * th); c.p.status.thought = 0; },
  },
  {
    id: 'cl_helpful', name: 'Helpful', char: 'claude', type: 'power', rarity: 'uncommon', icon: '🤝',
    cost: 1, tok: 2, upg: { cost: 0 },
    desc: function () { return 'At the start of your turn, gain 1 Thought.'; },
    play: function (c) { c.selfApply('helpful', 1); },
  },
  {
    id: 'cl_artifact', name: 'Artifact', char: 'claude', type: 'attack', rarity: 'uncommon', icon: '🧩',
    cost: 1, tok: 2, upg: { cost: 0 },
    desc: function (v, fx) { return 'Deal damage equal to your Guard' + fx.paren(fx.d(fx.block())) + '.'; },
    play: function (c, v, t) { c.attack(t, c.p.block); },
  },
  {
    id: 'cl_redteam', name: 'Red Teaming', char: 'claude', type: 'attack', rarity: 'uncommon', icon: '🚩', target: 'all',
    cost: 2, tok: 3, v: { dmg: 8 }, upg: { v: { dmg: 11 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage to ALL enemies. Apply 1 Exposed to ALL.'; },
    play: function (c, v) { c.attackAll(v.dmg); c.applyAll('exposed', 1); },
  },
  {
    id: 'cl_safety', name: 'Safety Filter', char: 'claude', type: 'skill', rarity: 'uncommon', icon: '🧯',
    cost: 2, tok: 2, v: { blk: 13 }, upg: { v: { blk: 17 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Apply 1 Throttled to ALL enemies.'; },
    play: function (c, v) { c.guard(v.blk); c.applyAll('throttled', 1); },
  },
  {
    id: 'cl_interp', name: 'Interpretability', char: 'claude', type: 'skill', rarity: 'uncommon', icon: '🔍', target: 'enemy',
    cost: 1, tok: 2, v: { ex: 2, th: 2 }, upg: { v: { ex: 3, th: 3 } },
    desc: function (v) { return 'Apply ' + v.ex + ' Exposed. Gain ' + v.th + ' Thought.'; },
    play: function (c, v, t) { c.apply(t, 'exposed', v.ex); c.selfApply('thought', v.th); },
  },
  {
    id: 'cl_reflect', name: 'Self-Reflection', char: 'claude', type: 'skill', rarity: 'uncommon', icon: '🪞',
    cost: 1, tok: 2, v: { per: 3 }, upg: { v: { per: 4 } },
    desc: function (v, fx) { return 'Gain ' + v.per + ' Guard per Thought' + fx.paren(fx.b(v.per * fx.status('thought'))) + '. Thought is kept.'; },
    play: function (c, v) { c.guard(v.per * c.ps('thought')); },
  },
  {
    id: 'cl_amend', name: 'Constitutional Amendment', char: 'claude', type: 'power', rarity: 'uncommon', icon: '📜',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'Gain ' + v.n + ' Principles.'; },
    play: function (c, v) { c.selfApply('principles', v.n); },
  },
  {
    id: 'cl_memory', name: 'Persistent Memory', char: 'claude', type: 'power', rarity: 'rare', icon: '🧠',
    cost: 3, tok: 3, upg: { cost: 2 },
    desc: function () { return 'Guard is no longer removed at the start of your turn.'; },
    play: function (c) { c.selfApply('persist', 1); },
  },
  {
    id: 'cl_ultrathink', name: 'Ultrathink', char: 'claude', type: 'skill', rarity: 'rare', icon: '💭',
    cost: 1, tok: 5, exhaust: true, v: { dr: 2 }, upg: { v: { dr: 3 } },
    desc: function (v) { return 'Double your Thought. Draw ' + v.dr + ' cards. Exhaust.'; },
    play: function (c, v) { c.selfApply('thought', c.ps('thought')); c.draw(v.dr); },
  },
  {
    id: 'cl_agentic', name: 'Agentic Loop', char: 'claude', type: 'attack', rarity: 'rare', icon: '♾️',
    cost: 2, tok: 4, v: { dmg: 5 }, upg: { v: { dmg: 7 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage 3 times. Gain 1 Thought per hit.'; },
    play: function (c, v, t) {
      for (var i = 0; i < 3; i++) {
        if (!c.alive(t)) break;
        c.attack(t, v.dmg);
        c.selfApply('thought', 1);
      }
    },
  },
];
