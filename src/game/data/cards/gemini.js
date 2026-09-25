// Gemini (Google DeepMind): Context scaling and Hotpatch over time.

export const GEMINI_CARDS = [
  {
    id: 'ge_search', name: 'Search', char: 'gemini', type: 'attack', rarity: 'basic', icon: '🔎',
    cost: 1, tok: 2, v: { dmg: 6 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'ge_safesearch', name: 'SafeSearch', char: 'gemini', type: 'skill', rarity: 'basic', icon: '🛡️',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 8 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'ge_scan', name: 'Multimodal Scan', char: 'gemini', type: 'attack', rarity: 'basic', icon: '🖼️',
    cost: 1, tok: 3, v: { dmg: 5, hp: 4 }, upg: { v: { dmg: 7, hp: 6 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Apply ' + v.hp + ' Hotpatch.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); c.apply(t, 'hotpatch', v.hp); },
  },
  {
    id: 'ge_needle', name: 'Needle in a Haystack', char: 'gemini', type: 'attack', rarity: 'common', icon: '🪡',
    cost: 1, tok: 3, v: { base: 3 }, upg: { v: { base: 6 } },
    desc: function (v, fx) {
      return 'Deal ' + v.base + ' + half your Context as damage' + fx.paren(fx.d(v.base + Math.floor(fx.contextAfter() / 2))) + '.';
    },
    play: function (c, v, t) { c.attack(t, v.base + Math.floor(c.p.context / 2)); },
  },
  {
    id: 'ge_grounding', name: 'Grounding', char: 'gemini', type: 'skill', rarity: 'common', icon: '⚓', target: 'enemy',
    cost: 1, tok: 2, v: { hp: 5 }, upg: { v: { hp: 7 } },
    desc: function (v) { return 'Apply ' + v.hp + ' Hotpatch.'; },
    play: function (c, v, t) { c.apply(t, 'hotpatch', v.hp); },
  },
  {
    id: 'ge_deepresearch', name: 'Deep Research', char: 'gemini', type: 'skill', rarity: 'common', icon: '📚',
    cost: 1, tok: 4, v: { dr: 3 }, upg: { v: { dr: 4 } },
    desc: function (v) { return 'Draw ' + v.dr + ' cards.'; },
    play: function (c, v) { c.draw(v.dr); },
  },
  {
    id: 'ge_flash', name: 'Flash', char: 'gemini', type: 'attack', rarity: 'common', icon: '⚡',
    cost: 0, tok: 2, v: { dmg: 4 }, upg: { v: { dmg: 6 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'ge_crawl', name: 'Crawl', char: 'gemini', type: 'skill', rarity: 'common', icon: '🕸️', target: 'all',
    cost: 1, tok: 3, v: { hp: 3 }, upg: { v: { hp: 4 } },
    desc: function (v) { return 'Apply ' + v.hp + ' Hotpatch to ALL enemies.'; },
    play: function (c, v) { c.applyAll('hotpatch', v.hp); },
  },
  {
    id: 'ge_surge', name: 'Token Surge', char: 'gemini', type: 'skill', rarity: 'common', icon: '🔋',
    cost: 0, tok: 6, v: { e: 1 }, upg: { v: { e: 2 } },
    desc: function (v) { return 'Gain ' + v.e + ' Compute.'; },
    play: function (c, v) { c.gainEnergy(v.e); },
  },
  {
    id: 'ge_recall', name: 'Long Context Recall', char: 'gemini', type: 'skill', rarity: 'common', icon: '🗂️',
    cost: 1, tok: 1, v: { base: 2 }, upg: { v: { base: 5 } },
    desc: function (v, fx) {
      return 'Gain ' + v.base + ' + half your Context as Guard' + fx.paren(fx.b(v.base + Math.floor(fx.contextAfter() / 2))) + '.';
    },
    play: function (c, v) { c.guard(v.base + Math.floor(c.p.context / 2)); },
  },
  {
    id: 'ge_pro', name: 'Pro Mode', char: 'gemini', type: 'skill', rarity: 'uncommon', icon: '💎', target: 'enemy',
    cost: 1, tok: 2, upg: { cost: 0 },
    desc: function () { return 'Double the target’s Hotpatch.'; },
    play: function (c, v, t) { c.apply(t, 'hotpatch', t.status.hotpatch || 0); },
  },
  {
    id: 'ge_veo', name: 'Veo Render', char: 'gemini', type: 'attack', rarity: 'uncommon', icon: '🎬',
    cost: 2, tok: 5, v: { dmg: 18 }, upg: { v: { dmg: 24 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'ge_imagen', name: 'Imagen', char: 'gemini', type: 'attack', rarity: 'uncommon', icon: '🎨', target: 'all',
    cost: 1, tok: 3, v: { dmg: 5, hp: 2 }, upg: { v: { dmg: 7, hp: 3 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage and apply ' + v.hp + ' Hotpatch to ALL enemies.'; },
    play: function (c, v) { c.attackAll(v.dmg); c.applyAll('hotpatch', v.hp); },
  },
  {
    id: 'ge_caching', name: 'Context Caching', char: 'gemini', type: 'power', rarity: 'uncommon', icon: '🗃️',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 5 } },
    desc: function (v) { return 'At the end of your turn, reduce your Context by ' + v.n + '.'; },
    play: function (c, v) { c.selfApply('caching', v.n); },
  },
  {
    id: 'ge_distill', name: 'Distill', char: 'gemini', type: 'skill', rarity: 'uncommon', icon: '⚗️',
    cost: 0, tok: 0, exhaust: true, v: { e: 1 }, upg: { v: { e: 2 } },
    desc: function (v) { return 'Reduce Context by 10. Gain ' + v.e + ' Compute. Exhaust.'; },
    play: function (c, v) { c.changeContext(-10); c.gainEnergy(v.e); },
  },
  {
    id: 'ge_nano', name: 'Nano', char: 'gemini', type: 'attack', rarity: 'uncommon', icon: '🍌',
    cost: 1, tok: 1, v: { dmg: 8 }, upg: { v: { dmg: 11 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage. Cheap on tokens.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'ge_infinite', name: 'Infinite Context', char: 'gemini', type: 'power', rarity: 'rare', icon: '🌌',
    cost: 2, tok: 3, upg: { cost: 1 },
    desc: function () { return 'Gain 15 max Context this combat.'; },
    play: function (c) { c.p.maxContext += 15; },
  },
  {
    id: 'ge_deepthink', name: 'Deep Think', char: 'gemini', type: 'power', rarity: 'rare', icon: '🧬',
    cost: 2, tok: 3, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'At the start of your turn, apply ' + v.n + ' Hotpatch to ALL enemies.'; },
    play: function (c, v) { c.selfApply('deepthink', v.n); },
  },
  {
    id: 'ge_ultra', name: 'Ultra', char: 'gemini', type: 'attack', rarity: 'rare', icon: '🌠',
    cost: 2, tok: 6, upg: { cost: 1 },
    desc: function (v, fx) { return 'Deal damage equal to your Context' + fx.paren(fx.d(fx.contextAfter())) + '.'; },
    play: function (c, v, t) { c.attack(t, c.p.context); },
  },
];
