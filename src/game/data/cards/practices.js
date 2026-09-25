// Practices: the real-world habits that beat each failure mode. Every character can use them.
// You earn one by fighting the failure it counters (the reward screen offers it), so the deck
// grows with what you have learned. Playing one Counters every enemy weak to it (see combat.js).
// /compact (shared.js) is the practice for Context Rot, and every starter deck already has it.

export const PRACTICE_CARDS = [
  {
    id: 'pr_run', name: 'Run It', char: 'practice', type: 'attack', rarity: 'practice', icon: '▶️',
    cost: 1, tok: 2, v: { dmg: 7 }, upg: { v: { dmg: 10 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'pr_devil', name: 'Devil’s Advocate', char: 'practice', type: 'attack', rarity: 'practice', icon: '😈',
    cost: 1, tok: 2, v: { dmg: 6, wk: 1 }, upg: { v: { dmg: 8, wk: 2 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Apply ' + v.wk + ' Throttled.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.apply(t, 'throttled', v.wk); },
  },
  {
    id: 'pr_specific', name: 'Be Specific', char: 'practice', type: 'skill', rarity: 'practice', icon: '🎯',
    cost: 0, tok: 2, v: { blk: 3 }, upg: { v: { blk: 6 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Draw 1 card.'; },
    play: function (c, v) { c.guard(v.blk); c.draw(1); },
  },
  {
    id: 'pr_docs', name: 'Read the Docs', char: 'practice', type: 'skill', rarity: 'practice', icon: '📚',
    cost: 1, tok: 3, v: { blk: 6 }, upg: { v: { blk: 9 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Exhaust every Warning in your hand.'; },
    play: function (c, v) { c.guard(v.blk); c.exhaustFromHand('warning'); },
  },
  {
    id: 'pr_diff', name: 'Review the Diff', char: 'practice', type: 'attack', rarity: 'practice', icon: '🔍',
    cost: 1, tok: 2, v: { dmg: 5, ex: 1 }, upg: { v: { dmg: 7, ex: 2 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Apply ' + v.ex + ' Exposed.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.apply(t, 'exposed', v.ex); },
  },
  {
    id: 'pr_done', name: 'Define Done', char: 'practice', type: 'skill', rarity: 'practice', icon: '📋',
    cost: 1, tok: 1, v: { blk: 8 }, upg: { v: { blk: 11 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'pr_commit', name: 'Commit First', char: 'practice', type: 'skill', rarity: 'practice', icon: '💾',
    cost: 1, tok: 1, v: { blk: 5, heal: 3 }, upg: { v: { blk: 7, heal: 5 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Heal ' + v.heal + ' HP.'; },
    play: function (c, v) { c.guard(v.blk); c.heal(v.heal); },
  },
  {
    id: 'pr_approve', name: 'Approve Commands', char: 'practice', type: 'skill', rarity: 'practice', icon: '✋',
    cost: 1, tok: 1, v: { blk: 9 }, upg: { v: { blk: 12 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'pr_privilege', name: 'Least Privilege', char: 'practice', type: 'skill', rarity: 'practice', icon: '🪪',
    cost: 1, tok: 0, v: { blk: 4, red: 4 }, upg: { v: { blk: 6, red: 6 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Reduce Context by ' + v.red + '.'; },
    play: function (c, v) { c.guard(v.blk); c.changeContext(-v.red); },
  },
  {
    id: 'pr_verify', name: 'Verify the Package', char: 'practice', type: 'attack', rarity: 'practice', icon: '🔎',
    cost: 1, tok: 2, v: { dmg: 8 }, upg: { v: { dmg: 11 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
];
