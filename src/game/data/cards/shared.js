// Shared cards: the /compact starter plus generated statuses and curses.

export const SHARED_CARDS = [
  {
    id: 'compact', name: '/compact', char: 'any', type: 'skill', rarity: 'basic', icon: '🗜️',
    cost: 1, tok: 0, upg: { cost: 0 },
    desc: function () { return 'Halve your Context. Draw 1 card.'; },
    play: function (c) { c.setContext(Math.floor(c.p.context / 2)); c.draw(1); },
  },
  {
    id: 'toolcall', name: 'Tool Call', char: 'gpt', type: 'attack', rarity: 'special', icon: '🔧',
    cost: 0, tok: 1, exhaust: true, v: { dmg: 3 }, upg: { v: { dmg: 5 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg + fx.status('parallel')) + ' damage. Exhaust.'; },
    play: function (c, v, t) { c.attack(t, v.dmg + c.ps('parallel')); },
  },
  {
    id: 'hallucination', name: 'Hallucination', char: 'any', type: 'status', rarity: 'special', icon: '🌀',
    cost: 0, tok: 0, unplayable: true, ethereal: true,
    desc: function () { return 'Unplayable. Ethereal.'; },
  },
  {
    id: 'warning', name: 'Warning', char: 'any', type: 'status', rarity: 'special', icon: '⚠️',
    cost: 1, tok: 1, exhaust: true, target: 'self',
    desc: function () { return 'Dismiss it. Exhaust.'; },
    play: function () {},
  },
  {
    id: 'pagerduty', name: 'PagerDuty Alert', char: 'any', type: 'status', rarity: 'special', icon: '📟',
    cost: 1, tok: 1, exhaust: true, target: 'self',
    desc: function () { return 'Acknowledge. Exhaust. If in hand at end of turn, take 3 damage.'; },
    play: function () {},
  },
  {
    id: 'techdebt', name: 'Tech Debt', char: 'any', type: 'curse', rarity: 'special', icon: '🧾',
    cost: 0, tok: 0, unplayable: true,
    desc: function () { return 'Unplayable. Curse.'; },
  },
  {
    id: 'phish_link', name: 'Phishing Link', char: 'any', type: 'status', rarity: 'special', icon: '🎣',
    cost: 0, tok: 3, exhaust: true, ethereal: true, target: 'self',
    desc: function () { return 'Gain 1 Compute. ALL enemies gain 1 Weights. Ethereal. Exhaust.'; },
    play: function (c) {
      c.gainEnergy(1);
      c.enemiesAlive().forEach(function (e) { c.enemyBuff(e, 'weights', 1); });
    },
  },
];
