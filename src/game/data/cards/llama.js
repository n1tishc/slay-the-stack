// Llama (Meta): Forks (copies of the last card you played) and open-source payoffs.
// `forker` cards make Forks; they are never copied themselves.

function lastName(fx) {
  return fx.paren(fx.lastPlayed() || 'nothing yet');
}

export const LLAMA_CARDS = [
  {
    id: 'll_generate', name: 'Generate', char: 'llama', type: 'attack', rarity: 'basic', icon: '🦙',
    cost: 1, tok: 2, v: { dmg: 6 }, upg: { v: { dmg: 9 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); },
  },
  {
    id: 'll_guard', name: 'Llama Guard', char: 'llama', type: 'skill', rarity: 'basic', icon: '🛡️',
    cost: 1, tok: 1, v: { blk: 5 }, upg: { v: { blk: 8 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.guard(v.blk); },
  },
  {
    id: 'll_fork', name: 'Fork', char: 'llama', type: 'skill', rarity: 'basic', icon: '🌿', forker: true,
    cost: 0, tok: 2, v: { n: 1 }, upg: { tok: 1, v: { n: 2 } },
    desc: function (v, fx) { return 'Fork the last card you played' + (v.n > 1 ? ' twice' : '') + lastName(fx) + '.'; },
    play: function (c, v) { c.forkLast(v.n); },
  },
  {
    id: 'll_pr', name: 'Pull Request', char: 'llama', type: 'skill', rarity: 'common', icon: '🔃', forker: true,
    cost: 1, tok: 2, v: { blk: 6 }, upg: { v: { blk: 9 } },
    desc: function (v, fx) { return 'Gain ' + fx.b(v.blk) + ' Guard. Fork the last card you played' + lastName(fx) + '.'; },
    play: function (c, v) { c.guard(v.blk); c.forkLast(1); },
  },
  {
    id: 'll_replicate', name: 'Self-Replicate', char: 'llama', type: 'attack', rarity: 'common', icon: '👯',
    cost: 1, tok: 2, v: { dmg: 5 }, upg: { v: { dmg: 7 } },
    // Only the original copies itself: a free Fork that copied itself would loop forever.
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage.' + (fx.isFork() ? '' : ' Add a Fork of this card to your hand.'); },
    play: function (c, v, t) { c.attack(t, v.dmg); if (!c.playing.fork) c.addFork(c.playing.id, c.playing.up); },
  },
  {
    id: 'll_quantize', name: 'Quantize', char: 'llama', type: 'skill', rarity: 'common', icon: '🔢',
    cost: 0, tok: 0, v: { red: 3, blk: 3 }, upg: { v: { red: 5, blk: 5 } },
    desc: function (v, fx) { return 'Reduce Context by ' + v.red + '. Gain ' + fx.b(v.blk) + ' Guard.'; },
    play: function (c, v) { c.changeContext(-v.red); c.guard(v.blk); },
  },
  {
    id: 'll_community', name: 'Community Patch', char: 'llama', type: 'attack', rarity: 'common', icon: '🧵',
    cost: 1, tok: 2, v: { dmg: 5, per: 2 }, upg: { v: { dmg: 7, per: 3 } },
    desc: function (v, fx) {
      return 'Deal ' + v.dmg + ' damage, +' + v.per + ' per Fork played this combat' + fx.paren(fx.d(v.dmg + v.per * fx.forks())) + '.';
    },
    play: function (c, v, t) { c.attack(t, v.dmg + v.per * c.forksPlayed); },
  },
  {
    id: 'll_herd', name: 'Herd', char: 'llama', type: 'attack', rarity: 'common', icon: '🐑', target: 'all',
    cost: 1, tok: 2, v: { dmg: 5 }, upg: { v: { dmg: 7 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage to ALL enemies.'; },
    play: function (c, v) { c.attackAll(v.dmg); },
  },
  {
    id: 'll_upvote', name: 'Upvote', char: 'llama', type: 'skill', rarity: 'common', icon: '⬆️', target: 'enemy', forker: true,
    cost: 0, tok: 1, v: { ex: 1 }, upg: { v: { ex: 2 } },
    desc: function (v, fx) { return 'Apply ' + v.ex + ' Exposed. Fork the last card you played' + lastName(fx) + '.'; },
    play: function (c, v, t) { c.apply(t, 'exposed', v.ex); c.forkLast(1); },
  },
  {
    id: 'll_dump', name: 'Weights Dump', char: 'llama', type: 'attack', rarity: 'common', icon: '🗄️',
    cost: 1, tok: 2, v: { per: 2 }, upg: { v: { per: 3 } },
    desc: function (v, fx) {
      return 'Deal ' + v.per + ' damage per other card in your hand' + fx.paren(fx.d(v.per * fx.otherCards())) + '.';
    },
    play: function (c, v, t) { c.attack(t, v.per * c.hand.length); },
  },
  {
    id: 'll_modelcard', name: 'Model Card', char: 'llama', type: 'skill', rarity: 'common', icon: '📇',
    cost: 1, tok: 1, v: { dr: 2 }, upg: { v: { dr: 3 } },
    desc: function (v) { return 'Draw ' + v.dr + ' cards.'; },
    play: function (c, v) { c.draw(v.dr); },
  },
  {
    id: 'll_opensource', name: 'Open Source', char: 'llama', type: 'power', rarity: 'uncommon', icon: '🌍',
    cost: 1, tok: 2, v: { n: 3 }, upg: { v: { n: 4 } },
    desc: function (v) { return 'Whenever you play a Fork, deal ' + v.n + ' damage to a random enemy.'; },
    play: function (c, v) { c.selfApply('opensrc', v.n); },
  },
  {
    id: 'll_ecosystem', name: 'Ecosystem', char: 'llama', type: 'power', rarity: 'uncommon', icon: '🌱',
    cost: 1, tok: 2, upg: { cost: 0 },
    desc: function () { return 'At the start of your turn, add a Fork of a random card in your hand.'; },
    play: function (c) { c.selfApply('ecosystem', 1); },
  },
  {
    id: 'll_merge', name: 'Merge', char: 'llama', type: 'attack', rarity: 'uncommon', icon: '🪢',
    cost: 2, tok: 3, v: { dmg: 6, per: 6 }, upg: { v: { dmg: 8, per: 8 } },
    desc: function (v, fx) {
      return 'Exhaust the Forks in your hand. Deal ' + v.dmg + ' damage, +' + v.per + ' for each' +
        fx.paren(fx.d(v.dmg + v.per * fx.forksInHand())) + '.';
    },
    play: function (c, v, t) {
      var n = c.forksInHand();
      c.hand = c.hand.filter(function (inst) {
        if (!inst.fork) return true;
        c.exhaust.push(inst);
        return false;
      });
      c.attack(t, v.dmg + v.per * n);
    },
  },
  {
    id: 'll_purple', name: 'Purple Llama', char: 'llama', type: 'skill', rarity: 'uncommon', icon: '🟣',
    cost: 2, tok: 2, v: { blk: 10, per: 3 }, upg: { v: { blk: 13, per: 4 } },
    desc: function (v, fx) {
      return 'Gain ' + v.blk + ' Guard, +' + v.per + ' per Fork in your hand' + fx.paren(fx.b(v.blk + v.per * fx.forksInHand())) + '.';
    },
    play: function (c, v) { c.guard(v.blk + v.per * c.forksInHand()); },
  },
  {
    id: 'll_mirror', name: 'Mirror Repo', char: 'llama', type: 'skill', rarity: 'uncommon', icon: '📋', forker: true,
    cost: 1, tok: 1, upg: { cost: 0 },
    desc: function (v, fx) { return 'Fork the last card you played twice' + lastName(fx) + '.'; },
    play: function (c) { c.forkLast(2); },
  },
  {
    id: 'll_lora', name: 'LoRA Adapter', char: 'llama', type: 'skill', rarity: 'uncommon', icon: '🔌',
    cost: 1, tok: 1, upg: { cost: 0 },
    desc: function () { return 'Fine-tune a random card in your hand for this combat. Draw 1 card.'; },
    play: function (c) { c.upgradeInHand(1); c.draw(1); },
  },
  {
    id: 'll_405b', name: '405B Parameters', char: 'llama', type: 'attack', rarity: 'rare', icon: '🏔️',
    cost: 3, tok: 4, v: { dmg: 14 }, upg: { v: { dmg: 18 } },
    desc: function (v, fx) { return 'Deal ' + fx.d(v.dmg) + ' damage twice.'; },
    play: function (c, v, t) { c.attack(t, v.dmg); if (c.alive(t)) c.attack(t, v.dmg); },
  },
  {
    id: 'll_license', name: 'Permissive License', char: 'llama', type: 'power', rarity: 'rare', icon: '📃',
    cost: 2, tok: 3, upg: { cost: 1 },
    desc: function () { return 'Forks you create are Fine-tuned. Whenever you play a Fork, draw 1 card.'; },
    play: function (c) { c.selfApply('license', 1); },
  },
  {
    id: 'll_zoo', name: 'Model Zoo', char: 'llama', type: 'skill', rarity: 'rare', icon: '🎪', forker: true,
    cost: 2, tok: 3, exhaust: true, upg: { cost: 1 },
    desc: function () { return 'Fork every card in your hand. Exhaust.'; },
    play: function (c) {
      c.hand.filter(function (inst) { return c.forkable(inst); }).forEach(function (inst) { c.addFork(inst.id, inst.up); });
    },
  },
];
