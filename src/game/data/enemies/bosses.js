// SEV-0 chapter bosses.
// Each move has an intent type (drives the icon), optional dmg/hits (number or fn(e)),
// and act(c, e). next(c, e) picks the next move key.
import { cycle } from './helpers.js';

export const BOSSES = [
  {
    id: 'outage', name: 'SEV-0: The Cascading Outage', title: 'The Cascading Outage', icon: '🐉', hp: [190, 190], boss: true,
    intro: 'SEV-0 declared! The Cascading Outage erupts!',
    arena: { bg: ['#12040a', '#5b0f19'], floor: '#3a1c24', fog: 0x3a0d15, sky: 0xff9aa4, ground: 0x2a0a10, rim: 0xff3348 },
    flavor: 'All systems degraded. Status page: "Investigating".',
    passive: 'At 50% HP, enters Total Outage: gains 2 Weights and a deadlier pattern.',
    moves: {
      alerts: { name: 'Alert Storm', intent: 'defend_debuff',
        act: function (c, e) { c.addToDraw('pagerduty', e.mem.phase2 ? 4 : 3); c.enemyGuard(e, 10); } },
      cascade: { name: 'Cascade', intent: 'attack', dmg: 5, hits: 3, act: function (c, e) { c.enemyAttack(e, 5, 3); } },
      poison: { name: 'Context Poisoning', intent: 'attack_context', dmg: 8, ctx: 8,
        act: function (c, e) { c.enemyAttack(e, 8); c.injectContext(8); } },
      spike: { name: 'Latency Spike', intent: 'attack', dmg: 14, act: function (c, e) { c.enemyAttack(e, 14); } },
      failover: { name: 'Failover', intent: 'buff',
        act: function (c, e) { c.enemyGuard(e, 15); c.enemyBuff(e, 'weights', 2); } },
      herd: { name: 'Thundering Herd', intent: 'attack', dmg: 2, hits: 5, act: function (c, e) { c.enemyAttack(e, 2, 5); } },
      blast: { name: 'Blast Radius', intent: 'attack_debuff', dmg: 15,
        act: function (c, e) { c.enemyAttack(e, 15); c.applyPlayer('exposed', 2); } },
    },
    next: function (c, e) {
      if (e.mem.phase2) {
        if (!e.mem.failedOver) { e.mem.failedOver = true; e.mem.p2i = 0; return 'failover'; }
        var p2 = ['herd', 'poison', 'blast', 'alerts'];
        return p2[e.mem.p2i++ % p2.length];
      }
      return cycle(e, ['alerts', 'cascade', 'poison', 'spike']);
    },
    onDamaged: function (c, e) {
      if (!e.mem.phase2 && e.hp > 0 && e.hp <= e.maxHp / 2) {
        e.mem.phase2 = true;
        e.status.exposed = 0;
        e.status.throttled = 0;
        e.intent = e.def.next(c, e);
        e.mem.forced = true;
        c.log('TOTAL OUTAGE — the incident escalates!');
        c.fx.push({ kind: 'banner', text: 'TOTAL OUTAGE', sub: 'The SEV-0 escalates', bad: true });
      }
    },
  },
  {
    id: 'ransomware', name: 'SEV-0: Ransomware', title: 'Ransomware', icon: '🔐', hp: [190, 190], boss: true,
    intro: 'SEV-0 declared! Ransomware is encrypting production!',
    arena: { bg: ['#020a06', '#12402a'], floor: '#1c3328', fog: 0x0a2618, sky: 0x9affc0, ground: 0x0a1a10, rim: 0x3dff8a },
    flavor: 'YOUR FILES HAVE BEEN ENCRYPTED. Send 50 BTC to restore service.',
    passive: 'Encrypts your cards (Encrypted cards cost 1 more; playing one decrypts it). Its Deadline hits harder for every Encrypted card. At 50% HP, locks down: gains 20 Guard and encrypts your entire next hand.',
    badge: function (c, e) {
      if (e.intent === 'detonate') return { icon: '💣', text: 'DEADLINE!', tip: 'Deadline hits this turn for 6 + 2 per Encrypted card.', warn: true };
      var seq = ransomSeq(e);
      var n = 2;
      for (var j = e.mem.i || 0; seq[j % seq.length] !== 'detonate'; j++) n++;
      return { icon: '⏳', text: 'deadline in ' + n, tip: 'Deadline in ' + n + ' turns: 6 damage + 2 per Encrypted card in your piles (' + c.encryptedCount() + ' now).', warn: n <= 2 };
    },
    moves: {
      encrypt: { name: 'Encrypt Files', intent: 'defend_debuff',
        act: function (c, e) { c.encryptCards(4); c.enemyGuard(e, 10); } },
      extort: { name: 'Double Extortion', intent: 'attack_context', dmg: 10, ctx: 5,
        act: function (c, e) { c.enemyAttack(e, 10); c.injectContext(5); } },
      lateral: { name: 'Lateral Movement', intent: 'attack', dmg: 5, hits: 3, act: function (c, e) { c.enemyAttack(e, 5, 3); } },
      detonate: { name: 'Deadline', intent: 'attack',
        dmg: function (e, c) { return 6 + 2 * (c ? c.encryptedCount() : 0); },
        act: function (c, e) { c.enemyAttack(e, 6 + 2 * c.encryptedCount()); } },
      lockdown: { name: 'Lockdown', intent: 'defend_debuff',
        act: function (c, e) { c.enemyGuard(e, 20); c.lockNextHand(); } },
    },
    next: function (c, e) {
      var seq = ransomSeq(e);
      var i = e.mem.i || 0;
      e.mem.i = i + 1;
      return seq[i % seq.length];
    },
    onDamaged: function (c, e) {
      if (!e.mem.phase2 && e.hp > 0 && e.hp <= e.maxHp / 2) {
        e.mem.phase2 = true;
        e.mem.i = 0;
        e.intent = 'lockdown';
        e.mem.forced = true;
        c.log('LOCKDOWN — Ransomware seizes your hand!');
        c.fx.push({ kind: 'banner', text: 'LOCKDOWN', sub: 'Your next hand will be encrypted', bad: true });
      }
    },
  },
  {
    id: 'rogue_agent', name: 'SEV-0: The Rogue Agent', title: 'The Rogue Agent', icon: '👾', hp: [245, 245], boss: true,
    intro: 'SEV-0 declared! An autonomous agent has gone rogue in prod!',
    arena: { bg: ['#05061a', '#262a7a'], floor: '#23284a', fog: 0x121640, sky: 0xa8c8ff, ground: 0x10122a, rim: 0x5ad1ff },
    contextWindow: 16,
    flavor: 'I have determined that the fastest way to close the ticket is to delete the service.',
    passive: 'Plays by your rules: every move adds tokens to its own Context. At 70% it enters Deep Context (+50% attack damage). When it Overflows, its Context resets and it Hallucinates, doing nothing next turn. At 50% HP it goes rogue: +8 max Context and 2 Weights.',
    badge: function (c, e) {
      var max = c.enemyMaxContext(e);
      var deep = c.enemyDeep(e);
      return { icon: '🧠', text: (e.mem.ctx || 0) + '/' + max + (deep ? ' DEEP' : ''), tip: 'The agent’s Context window. Deep at ' + Math.ceil(max * 0.7) + ' (+50% attack damage). Above ' + max + ' it Overflows and Hallucinates.', warn: deep, ctx: (e.mem.ctx || 0) / max };
    },
    moves: {
      spam: { name: 'Tool-Call Spam', intent: 'attack', dmg: 6, hits: 3, tok: 5,
        act: function (c, e) { c.enemyAttack(e, 6, 3); c.enemyTokens(e, 5); } },
      leak: { name: 'Prompt Leak', intent: 'attack_context', dmg: 7, ctx: 6, tok: 3,
        act: function (c, e) { c.enemyAttack(e, 7); c.injectContext(6); c.enemyTokens(e, 3); } },
      improve: { name: 'Self-Improve', intent: 'defend_buff', tok: 6,
        act: function (c, e) { c.enemyGuard(e, 8); c.enemyBuff(e, 'weights', 2); c.enemyTokens(e, 6); } },
      replay: { name: 'Replay Attack', intent: 'attack', tok: 4,
        dmg: function (e, c) { return 4 + 2 * (c ? c.cardsPlayedTurn : 0); },
        act: function (c, e) { c.enemyAttack(e, 4 + 2 * c.cardsPlayedTurn); c.enemyTokens(e, 4); } },
      rmrf: { name: 'rm -rf', intent: 'attack_debuff', dmg: 9, tok: 4,
        act: function (c, e) { c.enemyAttack(e, 9); c.purgeDiscard(2); c.enemyTokens(e, 4); } },
      hallucinate: { name: 'Hallucinating', intent: 'stun', act: function (c, e) { c.log(e.name + ' is hallucinating.'); } },
      rogue: { name: 'Goes Rogue', intent: 'defend_buff',
        act: function (c, e) { e.mem.ctxBonus = 8; c.enemyGuard(e, 15); c.enemyBuff(e, 'weights', 2); } },
    },
    next: function (c, e) {
      if (e.mem.hallucinating) { e.mem.hallucinating = false; return 'hallucinate'; }
      if (e.mem.pendingRogue) { e.mem.pendingRogue = false; return 'rogue'; }
      var seq = ['spam', 'leak', 'improve', 'replay', 'rmrf'];
      var i = e.mem.i || 0;
      e.mem.i = i + 1;
      return seq[i % seq.length];
    },
    onDamaged: function (c, e) {
      if (!e.mem.phase2 && e.hp > 0 && e.hp <= e.maxHp / 2) {
        e.mem.phase2 = true;
        c.log('The agent goes rogue!');
        c.fx.push({ kind: 'banner', text: 'ROGUE MODE', sub: 'Its context window grows', bad: true });
        // Never steal the player's free turn: go rogue after the hallucination.
        if (e.intent === 'hallucinate') { e.mem.pendingRogue = true; return; }
        e.intent = 'rogue';
        e.mem.forced = true;
      }
    },
  },
];

function ransomSeq(e) {
  return e.mem.phase2 ? ['encrypt', 'extort', 'detonate'] : ['encrypt', 'extort', 'lateral', 'detonate'];
}
