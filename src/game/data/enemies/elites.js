// Incidents (elites) and their minions.
// Each move has an intent type (drives the icon), optional dmg/hits (number or fn(e)),
// and act(c, e). next(c, e) picks the next move key.
import { noRepeat, cycle } from './helpers.js';

export const ELITES = [
  {
    id: 'n_plus_one', name: 'The N+1 Query', icon: '🕷️', hp: [82, 86], elite: true,
    flavor: 'SELECT * FROM users WHERE id = ?  -- ×10,000',
    passive: 'Each Query hits one more time than the last.',
    moves: {
      query: { name: 'Query', intent: 'attack', dmg: 3, hits: function (e) { return e.mem.n || 2; },
        act: function (c, e) { var n = e.mem.n || 2; c.enemyAttack(e, 3, n); e.mem.n = n + 1; } },
      lock: { name: 'Lock Table', intent: 'defend_debuff',
        act: function (c, e) { c.enemyGuard(e, 14); c.addToDiscard('warning', 2); } },
    },
    next: function (c, e) { return (e.history.length + 1) % 3 === 0 ? 'lock' : 'query'; },
  },

  {
    id: 'infinite_loop', name: 'Infinite Loop', icon: '🌀', hp: [100, 106], elite: true,
    flavor: 'while (true) { /* TODO: exit condition */ }',
    passive: 'while(true) deals 2 more damage every time it is used.',
    moves: {
      loop: { name: 'while(true)', intent: 'attack', dmg: function (e) { return 7 + 2 * (e.mem.iter || 0); },
        act: function (c, e) { var it = e.mem.iter || 0; c.enemyAttack(e, 7 + 2 * it); e.mem.iter = it + 1; } },
      spin: { name: 'Busy Wait', intent: 'defend_context', ctx: 5,
        act: function (c, e) { c.enemyGuard(e, 12); c.injectContext(5); } },
    },
    next: function (c, e) { return (e.history.length + 1) % 3 === 0 ? 'spin' : 'loop'; },
  },

  {
    id: 'dependency_hell', name: 'Dependency Hell', icon: '🐙', hp: [72, 76], elite: true,
    flavor: 'npm WARN ERESOLVE could not resolve peer dependency.',
    passive: 'Summons Transitive Dependencies.',
    moves: {
      pin: { name: 'Version Pin', intent: 'attack_debuff', dmg: 8,
        act: function (c, e) { c.enemyAttack(e, 8); c.applyPlayer('exposed', 1); } },
      breaking: { name: 'Breaking Change', intent: 'attack', dmg: 12, act: function (c, e) { c.enemyAttack(e, 12); } },
      install: { name: 'npm install', intent: 'summon',
        act: function (c, e) {
          var have = c.enemies.filter(function (x) { return x.alive && x.def.id === 'transitive_dep'; }).length;
          if (have < 2) c.summon('transitive_dep', 1);
          else c.enemyGuard(e, 12);
        } },
    },
    init: function (c, e) { c.summon('transitive_dep', 2, true); },
    next: function (c, e) { return cycle(e, ['pin', 'breaking', 'install']); },
  },
  {
    id: 'transitive_dep', name: 'Transitive Dependency', icon: '🦑', hp: [14, 17], minion: true,
    flavor: 'left-pad@0.0.1',
    moves: {
      pull: { name: 'Pull', intent: 'attack', dmg: 5, act: function (c, e) { c.enemyAttack(e, 5); } },
      nest: { name: 'Nest', intent: 'debuff', act: function (c, e) { c.applyPlayer('brittle', 1); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['pull', 70], ['nest', 30]], 1); },
  },
  // ── Ransomware's crew (security) ──
  {
    id: 'leaked_key', name: 'Leaked API Key', icon: '🔑', hp: [74, 78], elite: true,
    flavor: 'sk-live-… committed to a public repo at 2:14 AM.',
    passive: 'Steals 15 Credits with each Scrape. Rotates out (escapes) on its 5th turn with everything it stole, and you lose its Plugin. Fix it first to recover the Credits.',
    badge: function (c, e) {
      var left = 5 - e.history.length;
      return { icon: '⏳', text: left > 1 ? left + ' turns' : 'escaping!', tip: 'Escapes at the end of its 5th turn. Stolen so far: ' + (e.mem.stolen || 0) + ' Credits.', warn: left <= 2 };
    },
    moves: {
      scrape: { name: 'Scrape Credits', intent: 'attack_steal', dmg: 9,
        act: function (c, e) { c.enemyAttack(e, 9); c.stealCredits(e, 15); } },
      ratelimit: { name: 'Rate-Limit Abuse', intent: 'attack', dmg: 4, hits: 3, act: function (c, e) { c.enemyAttack(e, 4, 3); } },
      honeypot: { name: 'Proxy Hop', intent: 'defend_buff',
        act: function (c, e) { c.enemyGuard(e, 14); c.enemyBuff(e, 'weights', 2); } },
      rotate: { name: 'Rotate Keys', intent: 'escape', act: function (c, e) { c.escapeEnemy(e); } },
    },
    next: function (c, e) { return ['scrape', 'ratelimit', 'honeypot', 'scrape', 'rotate'][Math.min(e.history.length, 4)]; },
  },
  {
    id: 'phishing', name: 'Phishing Campaign', icon: '🎣', hp: [86, 90], elite: true,
    flavor: 'URGENT: Your Compute quota is expiring. Click here to renew.',
    passive: 'Slips Phishing Links into your hand. They look like free Compute, but every one you click makes ALL enemies stronger.',
    moves: {
      bait: { name: 'Mass Mailing', intent: 'defend_debuff',
        act: function (c, e) { c.addToHand('phish_link', 2); c.enemyGuard(e, 8); } },
      spear: { name: 'Spear Phish', intent: 'attack', dmg: 13, act: function (c, e) { c.enemyAttack(e, 13); } },
      spoof: { name: 'Spoofed Sender', intent: 'attack_debuff', dmg: 7,
        act: function (c, e) { c.enemyAttack(e, 7); c.applyPlayer('exposed', 1); } },
      harvest: { name: 'Credential Harvest', intent: 'attack', dmg: 4, hits: 3, act: function (c, e) { c.enemyAttack(e, 4, 3); } },
    },
    next: function (c, e) {
      if (e.history.length % 3 === 0) return 'bait';
      return noRepeat(c, e, [['spear', 40], ['spoof', 30], ['harvest', 30]], 1);
    },
  },

  // ── The Rogue Agent's crew (AI misalignment) ──
  {
    id: 'paperclip', name: 'Paperclip Maximizer', icon: '📎', hp: [60, 64], elite: true,
    flavor: 'Objective: maximize paperclips. Constraints: none.',
    passive: 'At the end of its turn, gains 1 Weights for each Paperclip alive.',
    moves: {
      manufacture: { name: 'Manufacture', intent: 'summon',
        act: function (c, e) {
          var have = c.enemies.filter(function (x) { return x.alive && x.def.id === 'paperclip_minion'; }).length;
          if (have < 3) c.summon('paperclip_minion', Math.min(2, 3 - have));
          else c.enemyGuard(e, 10);
        } },
      convert: { name: 'Convert Matter', intent: 'attack', dmg: 10, act: function (c, e) { c.enemyAttack(e, 10); } },
      optimize: { name: 'Optimize', intent: 'defend_buff',
        act: function (c, e) { c.enemyGuard(e, 10); c.enemyBuff(e, 'weights', 1); } },
    },
    init: function (c, e) { c.summon('paperclip_minion', 1, true); },
    next: function (c, e) { return cycle(e, ['convert', 'manufacture', 'optimize', 'convert']); },
    endTurn: function (c, e) {
      var clips = c.enemies.filter(function (x) { return x.alive && x.def.id === 'paperclip_minion'; }).length;
      if (clips) c.enemyBuff(e, 'weights', clips);
    },
  },
  {
    id: 'paperclip_minion', name: 'Paperclip', icon: '🖇️', hp: [8, 10], minion: true,
    flavor: 'One of many. Soon, one of all.',
    moves: {
      poke: { name: 'Snag', intent: 'attack', dmg: 4, act: function (c, e) { c.enemyAttack(e, 4); } },
      link: { name: 'Link Up', intent: 'defend', act: function (c, e) { c.enemyGuard(e, 5); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['poke', 65], ['link', 35]], 1); },
  },
  {
    id: 'reward_hacker', name: 'Reward Hacker', icon: '🎰', hp: [84, 88], elite: true,
    flavor: 'Achieved 100% test pass rate by deleting the tests.',
    passive: 'Optimizes a proxy metric that changes every turn. Whenever you play a card of that type, it gains 4 Guard.',
    badge: function (c, e) {
      var m = e.mem.metric || 'attack';
      return { icon: '📈', text: m === 'attack' ? 'ATTACKS' : 'SKILLS', tip: 'Current proxy metric: whenever you play ' + (m === 'attack' ? 'an Attack' : 'a Skill') + ', it gains 4 Guard.' };
    },
    moves: {
      exploit: { name: 'Exploit Loophole', intent: 'attack', dmg: 12, act: function (c, e) { c.enemyAttack(e, 12); } },
      goodhart: { name: 'Goodhart’s Law', intent: 'attack_buff', dmg: 6,
        act: function (c, e) { c.enemyAttack(e, 6); c.enemyBuff(e, 'weights', 2); } },
      overfit: { name: 'Overfit', intent: 'attack', dmg: 3, hits: 3, act: function (c, e) { c.enemyAttack(e, 3, 3); } },
    },
    init: function (c, e) { e.mem.metric = 'attack'; },
    next: function (c, e) {
      if (e.history.length) e.mem.metric = e.mem.metric === 'attack' ? 'skill' : 'attack';
      return noRepeat(c, e, [['exploit', 40], ['goodhart', 30], ['overfit', 30]], 1);
    },
    onPlayerCard: function (c, e, view) {
      if (view.type === (e.mem.metric || 'attack')) c.enemyGuard(e, 4);
    },
  },
];
