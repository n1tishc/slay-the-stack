// Combat engine. Pure state + rules; the UI reads `c` and calls play/endTurn/useScript.
//
// Context rules (the twist):
//   1. Playing a card pays its Compute, then adds its tokens to Context BEFORE it resolves,
//      so a card that pushes you into Deep Context benefits from it.
//   2. Deep Context: Context >= threshold (70% of max, 60% with Long Context) → attacks deal +50%.
//   3. After the card resolves, if Context > max you Hallucinate: Context → 0, remaining Compute → 0,
//      and a Hallucination is shuffled into your draw pile.
//   4. Enemies that inject Context can also overflow you (Context → 0, Hallucination added).

import { uid } from '../core/ids.js';
import { canUpgrade, cardView, newCard } from '../data/cards/index.js';
import { CHARACTERS } from '../data/characters.js';
import { ENEMIES } from '../data/enemies/index.js';
import { modeOf } from '../data/modes.js';
import { PLUGINS } from '../data/plugins.js';
import { SCRIPTS } from '../data/scripts.js';
import { Run } from './run.js';

var DEBUFFS = ['exposed', 'throttled', 'brittle'];
var HAND_LIMIT = 10;
var MAX_ENEMIES = 5;
var SWITCH_TYPES = { attack: true, skill: true };
var FORKABLE = { attack: true, skill: true, power: true };

export const Combat = function (run, enemyIds, kind) {
  var ch = CHARACTERS[run.char];
  this.run = run;
  this.mode = modeOf(run);
  this.kind = kind || 'normal';
  this.rng = Run.rng(run);
  this.p = {
    hp: run.hp,
    maxHp: run.maxHp,
    block: 0,
    energy: 0,
    maxEnergy: 3 + this.pluginSum('energyBonus'),
    context: 0,
    maxContext: ch.maxContext + this.pluginSum('contextBonus'),
    status: {},
  };
  this.draw_ = [];
  this.hand = [];
  this.discard = [];
  this.exhaust = [];
  this.powers = [];
  this.enemies = [];
  this.turn = 0;
  this.over = false;
  this.result = null;
  this.phase = 'player';
  this.fx = [];
  this.logs = [];
  this.cardsPlayedTurn = 0;
  this.attacksPlayedTurn = 0;
  this.freeTokenUsed = false;
  this.generated = 0;
  // Llama: the last card played this turn (what a Fork copies) and Forks played this combat.
  this.lastPlayed = null;
  this.forksPlayed = 0;
  // DeepSeek: the type of the last Attack or Skill played this turn, and the Switches so far.
  this.lastType = null;
  this.switchesTurn = 0;
  this.switching = false;
  this.forceSwitch = false;
  this.stats = { dealt: 0, taken: 0, played: 0, hallucinations: 0, escaped: 0, countered: 0 };
  for (var i = 0; i < enemyIds.length; i++) this.enemies.push(this.makeEnemy(enemyIds[i]));
};

var C = Combat.prototype;

// ───────── setup ─────────
C.makeEnemy = function (id, hpOverride) {
  var def = ENEMIES[id];
  var hp = hpOverride || Math.max(1, Math.round(this.rng.range(def.hp[0], def.hp[1]) * this.mode.hp));
  return { uid: uid(), def: def, name: def.name, hp: hp, maxHp: hp, block: 0, status: {}, mem: {}, history: [], intent: null, alive: true };
};

C.start = function () {
  var self = this;
  this.draw_ = this.rng.shuffle(
    this.run.deck.map(function (c) {
      return { uid: c.uid, id: c.id, up: c.up };
    }),
  );
  this.enemies.slice().forEach(function (e) {
    if (e.def.init) e.def.init(self, e);
  });
  this.enemies.forEach(function (e) {
    if (!e.intent) self.rollIntent(e);
  });
  this.eachPlugin('onCombatStart', [this]);
  this.startPlayerTurn();
  return this;
};

C.rollIntent = function (e) {
  e.intent = e.def.next(this, e);
};

// ───────── plugins ─────────
C.hasPlugin = function (id) {
  return this.run.plugins.indexOf(id) >= 0;
};
C.pluginSum = function (key) {
  var s = 0;
  for (var i = 0; i < this.run.plugins.length; i++) s += PLUGINS[this.run.plugins[i]][key] || 0;
  return s;
};
C.pluginFlag = function (key) {
  for (var i = 0; i < this.run.plugins.length; i++) if (PLUGINS[this.run.plugins[i]][key]) return PLUGINS[this.run.plugins[i]][key];
  return null;
};
C.eachPlugin = function (hook, args) {
  for (var i = 0; i < this.run.plugins.length && !this.over; i++) {
    var p = PLUGINS[this.run.plugins[i]];
    if (p[hook]) p[hook].apply(p, args);
  }
};

// ───────── helpers used by card/enemy data ─────────
C.log = function (msg) {
  this.logs.push(msg);
  if (this.logs.length > 60) this.logs.shift();
};
C.ps = function (s) {
  return this.p.status[s] || 0;
};
C.alive = function (e) {
  return !!e && e.alive;
};
C.enemiesAlive = function () {
  return this.enemies.filter(function (e) {
    return e.alive;
  });
};
C.randomEnemy = function () {
  var a = this.enemiesAlive();
  return a.length ? this.rng.pick(a) : null;
};
C.enemyByUid = function (uid) {
  for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].uid === uid) return this.enemies[i];
  return null;
};
// The chosen enemy if it is still alive, else the only one left; null when the choice is ambiguous.
C.pickTarget = function (targetUid) {
  var t = targetUid != null ? this.enemyByUid(targetUid) : null;
  if (this.alive(t)) return t;
  var alive = this.enemiesAlive();
  return alive.length === 1 ? alive[0] : null;
};

C.deepThreshold = function () {
  var frac = this.pluginFlag('deepThreshold') || 0.7;
  return Math.ceil(this.p.maxContext * frac);
};
C.isDeep = function (ctx) {
  if (ctx === undefined) ctx = this.p.context;
  return ctx >= this.deepThreshold();
};
C.tokensFor = function (view) {
  if (this.ps('freetok')) return 0;
  if (this.pluginFlag('firstCardFree') && !this.freeTokenUsed) return 0;
  return view.tok;
};

// Damage math: flat Weights first, then multipliers, floor once.
C.playerAttackDamage = function (base, target, ctx) {
  var d = base + this.ps('weights');
  if (this.isDeep(ctx)) d *= 1.5;
  if (this.ps('throttled') > 0) d *= 0.75;
  if (target && (target.status.exposed || 0) > 0) d *= 1.5;
  return Math.max(0, Math.floor(d));
};
C.enemyAttackDamage = function (e, base) {
  var d = (base + (e.status.weights || 0)) * this.mode.dmg;
  if (this.enemyDeep(e)) d *= 1.5;
  if ((e.status.throttled || 0) > 0) d *= 0.75;
  if (this.ps('exposed') > 0) d *= 1.5;
  return Math.max(0, Math.floor(d));
};
C.guardAmount = function (base) {
  var b = base + this.ps('robustness');
  if (this.ps('brittle') > 0) b *= 0.75;
  return Math.max(0, Math.floor(b));
};

C.attack = function (t, base) {
  if (!this.alive(t) || this.over) return;
  var d = this.playerAttackDamage(base, t);
  this.hitEnemy(t, d);
};
C.attackAll = function (base) {
  var self = this;
  this.enemiesAlive().forEach(function (e) {
    self.attack(e, base);
  });
};
C.rawDamage = function (e, n) {
  if (!this.alive(e) || this.over) return;
  this.hitEnemy(e, n);
};
C.hitEnemy = function (e, dmg) {
  var blocked = Math.min(e.block, dmg);
  e.block -= blocked;
  var loss = dmg - blocked;
  e.hp -= loss;
  this.stats.dealt += loss;
  this.fx.push({ kind: 'dmg', target: e.uid, amount: loss, blocked: blocked });
  if (e.hp <= 0) this.killEnemy(e);
  else if (e.def.onDamaged) e.def.onDamaged(this, e);
};
C.loseHpEnemy = function (e, n) {
  if (!this.alive(e) || n <= 0) return;
  e.hp -= n;
  this.stats.dealt += n;
  this.fx.push({ kind: 'dmg', target: e.uid, amount: n, blocked: 0, poison: true });
  if (e.hp <= 0) this.killEnemy(e);
  else if (e.def.onDamaged) e.def.onDamaged(this, e);
};
C.killEnemy = function (e) {
  if (!e.alive) return;
  e.alive = false;
  e.hp = 0;
  this.log(e.name + ' was fixed.');
  this.fx.push({ kind: 'death', target: e.uid });
  this.run.stats.bugsFixed++;
  if (e.mem.stolen) {
    this.run.credits += e.mem.stolen;
    this.fx.push({ kind: 'credits', target: 'player', amount: e.mem.stolen });
    this.log('Recovered ' + e.mem.stolen + ' Credits.');
    e.mem.stolen = 0;
  }
  var self = this;
  this.eachPlugin('onEnemyDeath', [this, e]);
  this.enemiesAlive().forEach(function (o) {
    if (o.def.onAllyDeath) o.def.onAllyDeath(self, o, e);
  });
  this.scatterMinions();
  this.checkEnd();
};
// An enemy that leaves the fight without being fixed (no bugsFixed, no death hooks).
C.escapeEnemy = function (e) {
  if (!e.alive) return;
  e.alive = false;
  this.stats.escaped++;
  this.log(e.name + ' escaped!');
  this.fx.push({ kind: 'escape', target: e.uid });
  this.fx.push({ kind: 'death', target: e.uid, escaped: true });
  this.scatterMinions();
  this.checkEnd();
};
// Minions scatter once every non-minion is gone.
C.scatterMinions = function () {
  var self = this;
  var leaders = this.enemiesAlive().filter(function (o) {
    return !o.def.minion;
  });
  if (leaders.length === 0) {
    this.enemiesAlive().forEach(function (o) {
      o.alive = false;
      o.hp = 0;
      self.fx.push({ kind: 'death', target: o.uid });
    });
  }
};

C.guard = function (base) {
  var n = this.guardAmount(base);
  this.p.block += n;
  if (n > 0) this.fx.push({ kind: 'block', target: 'player', amount: n });
};
C.heal = function (n) {
  var before = this.p.hp;
  this.p.hp = Math.min(this.p.maxHp, this.p.hp + n);
  this.fx.push({ kind: 'heal', target: 'player', amount: this.p.hp - before });
};
C.apply = function (t, s, n) {
  if (!this.alive(t) || n <= 0) return;
  t.status[s] = (t.status[s] || 0) + n;
  this.fx.push({ kind: 'status', target: t.uid, status: s, amount: n });
};
C.applyAll = function (s, n) {
  var self = this;
  this.enemiesAlive().forEach(function (e) {
    self.apply(e, s, n);
  });
};
C.selfApply = function (s, n) {
  if (n <= 0) return;
  this.p.status[s] = (this.p.status[s] || 0) + n;
  this.fx.push({ kind: 'status', target: 'player', status: s, amount: n });
};
C.applyPlayer = C.selfApply;
C.gainEnergy = function (n) {
  this.p.energy += n;
};

// ───────── enemy context windows (the Rogue Agent plays by your rules) ─────────
C.enemyDeep = function (e) {
  var w = e.def.contextWindow;
  return !!w && (e.mem.ctx || 0) >= Math.ceil(this.enemyMaxContext(e) * 0.7);
};
C.enemyMaxContext = function (e) {
  return (e.def.contextWindow || 0) + (e.mem.ctxBonus || 0);
};
// Adds tokens to an enemy's own Context. Overflowing resets it and makes it Hallucinate (skip) next turn.
C.enemyTokens = function (e, n) {
  if (!e.alive) return;
  e.mem.ctx = (e.mem.ctx || 0) + n;
  if (e.mem.ctx > this.enemyMaxContext(e)) {
    e.mem.ctx = 0;
    e.mem.hallucinating = true;
    this.log(e.name + ' overflowed its context!');
    this.fx.push({ kind: 'banner', text: 'AGENT OVERFLOW', sub: e.name + ' will hallucinate' });
  }
};

// ───────── encryption (Ransomware) ─────────
// Encrypted cards cost 1 more Compute; playing one decrypts it. Lasts for this combat only.
C.encryptable = function (inst) {
  var v = cardView(inst);
  return !inst.enc && !v.unplayable && v.type !== 'status' && v.type !== 'curse';
};
C.encryptCards = function (n, handOnly) {
  var pool = this.hand.slice();
  if (!handOnly) pool = pool.concat(this.draw_, this.discard);
  var self = this;
  pool = pool.filter(function (inst) {
    return self.encryptable(inst);
  });
  var picked = this.rng.shuffle(pool).slice(0, n);
  picked.forEach(function (inst) {
    inst.enc = true;
  });
  if (picked.length) this.fx.push({ kind: 'encrypt', target: 'player', amount: picked.length });
  return picked.length;
};
// Encrypts every card in the player's next hand as it is drawn.
C.lockNextHand = function () {
  this.lockHand = true;
};
C.encryptedCount = function () {
  var piles = this.hand.concat(this.draw_, this.discard);
  return piles.filter(function (inst) {
    return inst.enc;
  }).length;
};

// ───────── credits (Leaked API Key) ─────────
C.stealCredits = function (e, n) {
  var amount = Math.min(n, this.run.credits);
  if (amount <= 0 || !e.alive) return;
  this.run.credits -= amount;
  e.mem.stolen = (e.mem.stolen || 0) + amount;
  this.fx.push({ kind: 'credits', target: 'player', amount: -amount });
};

// ───────── Forks (Llama) ─────────
// A Fork is a copy of a card: 1 Compute cheaper, Ethereal, and Exhausted when played. Cards that fork (`forker`)
// are never copied themselves, and a Fork never makes a Fork of itself, so Forks cannot loop.
C.addFork = function (id, up) {
  if (this.over) return;
  this.generated++;
  var inst = newCard(id, up || this.ps('license') > 0);
  inst.fork = true;
  if (this.hand.length < HAND_LIMIT) this.hand.push(inst);
  else this.exhaust.push(inst);
};
C.forkLast = function (n) {
  for (var i = 0; i < n && this.lastPlayed; i++) this.addFork(this.lastPlayed.id, this.lastPlayed.up);
};
C.forkable = function (inst) {
  var v = cardView(inst);
  return !!FORKABLE[v.type] && !v.def.forker && !v.unplayable;
};
C.forkRandom = function (n) {
  var self = this;
  for (var i = 0; i < n; i++) {
    var pool = this.hand.filter(function (inst) {
      return self.forkable(inst);
    });
    if (!pool.length) return;
    var pick = this.rng.pick(pool);
    this.addFork(pick.id, pick.up);
  }
};
C.forksInHand = function () {
  return this.hand.filter(function (inst) {
    return inst.fork;
  }).length;
};
C.onFork = function () {
  this.forksPlayed++;
  if (this.ps('opensrc')) this.attack(this.randomEnemy(), this.ps('opensrc'));
  if (this.ps('license')) this.draw(1);
};
// Fine-tunes random cards in hand for this combat only (the run's deck is untouched).
C.upgradeInHand = function (n) {
  var pool = this.hand.filter(function (inst) {
    return !inst.up && canUpgrade(inst);
  });
  this.rng
    .shuffle(pool)
    .slice(0, n)
    .forEach(function (inst) {
      inst.up = true;
    });
};

// ───────── Switches (DeepSeek) ─────────
// A card is a Switch when it is an Attack played right after a Skill, or a Skill right after an
// Attack (Powers and statuses don't break the chain).
C.wouldSwitch = function (view) {
  if (!SWITCH_TYPES[view.type]) return false;
  if (this.ps('allexperts') || this.forceSwitch) return true;
  return !!this.lastType && this.lastType !== view.type;
};
C.onSwitch = function () {
  if (this.ps('shared')) this.guard(this.ps('shared'));
  if (this.ps('gating')) this.attack(this.randomEnemy(), this.ps('gating'));
};

// ───────── counters (Practice cards) ─────────
// Playing the Practice a failure mode is weak to cancels its next move and leaves it Exposed.
C.counter = function (view) {
  var self = this;
  this.enemiesAlive().forEach(function (e) {
    if (e.def.weakness !== view.id) return;
    e.mem.caught = true;
    self.apply(e, 'exposed', 2);
    self.stats.countered++;
    self.log(view.name + ' countered ' + e.name + '.');
    self.fx.push({ kind: 'counter', target: e.uid, card: view.name });
  });
};

// Moves every card with this id from the hand to the exhaust pile.
C.exhaustFromHand = function (id) {
  var self = this;
  this.hand = this.hand.filter(function (inst) {
    if (inst.id !== id) return true;
    self.exhaust.push(inst);
    return false;
  });
};

// Moves n random cards from the discard pile to the exhaust pile.
C.purgeDiscard = function (n) {
  var picked = this.rng.shuffle(this.discard.slice()).slice(0, n);
  var self = this;
  picked.forEach(function (inst) {
    self.discard.splice(self.discard.indexOf(inst), 1);
    self.exhaust.push(inst);
  });
  if (picked.length) this.fx.push({ kind: 'purge', target: 'player', amount: picked.length });
  return picked.length;
};

// ───────── context ─────────
C.setContext = function (n) {
  this.p.context = Math.max(0, n);
};
C.changeContext = function (d) {
  this.p.context = Math.max(0, this.p.context + d);
};
C.injectContext = function (n) {
  this.p.context += n;
  this.fx.push({ kind: 'context', amount: n });
  this.log('Your Context was injected with ' + n + ' tokens.');
  if (this.p.context > this.p.maxContext) this.overflow(false);
};
C.overflow = function (duringPlayerTurn) {
  this.p.context = 0;
  if (duringPlayerTurn && !this.pluginFlag('keepEnergyOnOverflow')) this.p.energy = 0;
  this.addToDraw('hallucination', 1);
  this.stats.hallucinations++;
  this.run.stats.hallucinations++;
  this.log('CONTEXT OVERFLOW: you hallucinate.');
  this.fx.push({ kind: 'banner', text: 'CONTEXT OVERFLOW', sub: 'You hallucinate' });
};

// ───────── piles ─────────
C.draw = function (n) {
  for (var i = 0; i < n; i++) {
    if (this.hand.length >= HAND_LIMIT) return;
    if (this.draw_.length === 0) {
      if (this.discard.length === 0) return;
      this.draw_ = this.rng.shuffle(this.discard);
      this.discard = [];
    }
    this.hand.push(this.draw_.pop());
  }
};
C.addToHand = function (id, n, up) {
  for (var i = 0; i < n; i++) {
    this.generated++;
    var inst = newCard(id, up);
    if (this.hand.length < HAND_LIMIT) this.hand.push(inst);
    else this.discard.push(inst);
  }
};
C.addToDraw = function (id, n) {
  for (var i = 0; i < n; i++) {
    this.generated++;
    this.draw_.splice(this.rng.int(this.draw_.length + 1), 0, newCard(id));
  }
};
C.addToDiscard = function (id, n) {
  for (var i = 0; i < n; i++) {
    this.generated++;
    this.discard.push(newCard(id));
  }
};

// ───────── enemies acting on the board ─────────
C.enemyAttack = function (e, base, hits) {
  hits = hits || 1;
  for (var i = 0; i < hits; i++) {
    if (this.over || !e.alive) return;
    this.damagePlayer(this.enemyAttackDamage(e, base), e);
  }
};
C.enemyGuard = function (e, n) {
  e.block += n;
  this.fx.push({ kind: 'block', target: e.uid, amount: n });
};
C.enemyBuff = function (e, s, n) {
  e.status[s] = (e.status[s] || 0) + n;
  this.fx.push({ kind: 'status', target: e.uid, status: s, amount: n });
};
C.damagePlayer = function (n, attacker) {
  var blocked = Math.min(this.p.block, n);
  this.p.block -= blocked;
  var loss = n - blocked;
  this.p.hp -= loss;
  this.stats.taken += loss;
  this.fx.push({ kind: 'dmg', target: 'player', amount: loss, blocked: blocked });
  if (attacker && attacker.alive) {
    var reflect = this.ps('pushback') + this.ps('principles');
    if (reflect > 0) this.hitEnemy(attacker, reflect);
  }
  if (this.p.hp <= 0) {
    if (this.hasPlugin('circuit_breaker') && !this.run.circuitUsed) {
      this.run.circuitUsed = true;
      this.p.hp = Math.floor(this.p.maxHp * 0.3);
      this.fx.push({ kind: 'banner', text: 'CIRCUIT BREAKER', sub: 'Service restored at 30%' });
      this.log('Circuit Breaker tripped!');
    } else {
      this.p.hp = 0;
      this.over = true;
      this.result = 'lose';
    }
  }
};
C.summon = function (id, n, front) {
  for (var i = 0; i < n; i++) {
    if (this.enemiesAlive().length >= MAX_ENEMIES) return;
    var e = this.makeEnemy(id);
    this.rollIntent(e);
    if (front) this.enemies.unshift(e);
    else this.enemies.splice(this.enemies.length - 1, 0, e);
  }
};
C.splitEnemy = function (e, id, n) {
  var idx = this.enemies.indexOf(e);
  var hp = Math.max(1, e.hp);
  e.alive = false;
  this.fx.push({ kind: 'death', target: e.uid });
  this.log(e.name + ' split!');
  var spawned = [];
  for (var i = 0; i < n; i++) {
    var s = this.makeEnemy(id, hp);
    this.rollIntent(s);
    spawned.push(s);
  }
  this.enemies.splice.apply(this.enemies, [idx + 1, 0].concat(spawned));
};

// ───────── player actions ─────────
C.canPlay = function (idx) {
  if (this.over || this.phase !== 'player') return false;
  var inst = this.hand[idx];
  if (!inst) return false;
  var v = cardView(inst);
  if (v.unplayable) return false;
  return this.p.energy >= v.cost;
};
C.needsTarget = function (idx) {
  var v = cardView(this.hand[idx]);
  return v.target === 'enemy' && this.enemiesAlive().length > 1;
};

C.play = function (idx, targetUid) {
  if (!this.canPlay(idx)) return false;
  var inst = this.hand[idx];
  var view = cardView(inst);
  var t = null;
  if (view.target === 'enemy') {
    t = this.pickTarget(targetUid);
    if (!t) return false;
  }
  this.p.energy -= view.cost;
  this.hand.splice(idx, 1);
  if (inst.enc) inst.enc = false;
  var tok = this.tokensFor(view);
  this.freeTokenUsed = true;
  this.p.context += tok;
  this.cardsPlayedTurn++;
  this.stats.played++;
  if (view.type === 'attack') this.attacksPlayedTurn++;
  this.switching = this.wouldSwitch(view);
  if (this.switching) this.switchesTurn++;
  if (SWITCH_TYPES[view.type]) this.forceSwitch = false;
  this.playing = inst;
  this.fx.push({ kind: 'play', card: view.name, tok: tok, type: view.type });
  if (view.def.play) view.def.play(this, view.v, t);
  if (!this.over) this.counter(view);
  if (!this.over && this.switching) this.onSwitch();
  if (!this.over && inst.fork) this.onFork();
  if (SWITCH_TYPES[view.type]) this.lastType = view.type;
  if (FORKABLE[view.type] && !view.def.forker) this.lastPlayed = { id: inst.id, up: inst.up };
  var self = this;
  this.enemiesAlive().forEach(function (e) {
    if (e.def.onPlayerCard) e.def.onPlayerCard(self, e, view);
  });

  if (view.type === 'power') this.powers.push(inst);
  else if (view.exhaust) this.exhaust.push(inst);
  else this.discard.push(inst);

  this.eachPlugin('onCardPlayed', [this, view]);
  this.switching = false;
  this.playing = null;
  if (!this.over && this.p.context > this.p.maxContext) this.overflow(true);
  this.checkEnd();
  return true;
};

C.useScript = function (slot, targetUid) {
  if (this.over || this.phase !== 'player') return false;
  var id = this.run.scripts[slot];
  if (!id) return false;
  var s = SCRIPTS[id];
  var t = null;
  if (s.target === 'enemy') {
    t = this.pickTarget(targetUid);
    if (!t) return false;
  }
  this.run.scripts.splice(slot, 1);
  s.use(this, t);
  this.checkEnd();
  return true;
};

C.checkEnd = function () {
  if (this.over) return;
  if (this.enemiesAlive().length === 0) {
    this.over = true;
    this.result = 'win';
  }
};

// ───────── turn flow ─────────
C.startPlayerTurn = function () {
  if (this.over) return;
  this.turn++;
  this.phase = 'player';
  if (this.turn > 1 && !this.ps('persist')) this.p.block = 0;
  this.p.status.pushback = 0;
  this.p.energy = this.p.maxEnergy;
  this.freeTokenUsed = false;
  this.p.status.freetok = 0;
  this.cardsPlayedTurn = 0;
  this.attacksPlayedTurn = 0;
  this.lastPlayed = null;
  this.lastType = null;
  this.switchesTurn = 0;
  this.forceSwitch = false;
  this.draw(5 + (this.turn === 1 ? this.pluginSum('firstTurnDraw') : 0));
  if (this.lockHand) {
    this.lockHand = false;
    this.encryptCards(HAND_LIMIT, true);
  }
  if (this.ps('helpful')) this.selfApply('thought', this.ps('helpful'));
  if (this.ps('deepthink')) this.applyAll('hotpatch', this.ps('deepthink'));
  if (this.ps('reasoning')) {
    this.addToHand('toolcall', this.ps('reasoning'));
    this.draw(this.ps('reasoning'));
  }
  if (this.ps('ecosystem')) this.forkRandom(this.ps('ecosystem'));
  this.eachPlugin('onTurnStart', [this]);
  this.checkEnd();
};

// Stepped enemy turn so the UI can animate each enemy; endTurn() runs it all at once.
C.endTurnBegin = function () {
  if (this.over || this.phase !== 'player') return false;
  var keep = [];
  for (var i = 0; i < this.hand.length; i++) {
    var inst = this.hand[i];
    if (inst.id === 'pagerduty' && !this.over) {
      this.log('A PagerDuty Alert went unanswered.');
      this.damagePlayer(3, null);
    }
    var v = cardView(inst);
    if (v.ethereal) this.exhaust.push(inst);
    else keep.push(inst);
  }
  this.hand = [];
  Array.prototype.push.apply(this.discard, keep);
  if (this.ps('caching')) this.changeContext(-this.ps('caching'));
  this.eachPlugin('onTurnEnd', [this]);
  var st = this.p.status;
  DEBUFFS.forEach(function (d) {
    if (st[d] > 0) st[d]--;
  });
  this.phase = 'enemy';
  return !this.over;
};
C.enemyOrder = function () {
  return this.enemiesAlive().map(function (e) {
    return e.uid;
  });
};
C.enemyAct = function (uid) {
  var e = this.enemyByUid(uid);
  if (this.over || !this.alive(e)) return;
  e.block = 0;
  var hp = e.status.hotpatch || 0;
  if (hp > 0) {
    this.loseHpEnemy(e, hp);
    e.status.hotpatch = hp - 1;
    if (!e.alive || this.over) return;
  }
  // Countered: the move is spent without running. It still counts toward cycles (so a countered
  // rm -rf is not simply retried next turn), but a forced move such as a pending split waits.
  if (e.mem.caught) {
    e.mem.caught = false;
    this.fx.push({ kind: 'enemyMove', target: e.uid, name: 'nothing (countered)', intent: 'caught' });
    if (!e.mem.forced) e.history.push(e.intent);
    return;
  }
  // A hook may force a new intent mid-act (e.g. Pushback triggers a split); record what actually ran.
  var key = e.intent;
  var move = e.def.moves[key];
  e.mem.forced = false;
  this.fx.push({ kind: 'enemyMove', target: e.uid, name: move.name, intent: move.intent });
  move.act(this, e);
  e.history.push(key);
};
C.endTurnFinish = function () {
  if (this.over) return;
  var self = this;
  this.enemiesAlive().forEach(function (e) {
    if (e.def.endTurn) e.def.endTurn(self, e);
    DEBUFFS.forEach(function (d) {
      if (e.status[d] > 0) e.status[d]--;
    });
    if (e.alive && !e.mem.forced) self.rollIntent(e);
  });
  this.startPlayerTurn();
};
C.endTurn = function () {
  if (!this.endTurnBegin()) return;
  var order = this.enemyOrder();
  for (var i = 0; i < order.length; i++) this.enemyAct(order[i]);
  this.endTurnFinish();
};

// What an enemy is about to do, with live damage numbers.
C.intentInfo = function (e) {
  if (e.mem.caught) return { name: 'Countered', type: 'caught', ctx: 0 };
  var m = e.def.moves[e.intent];
  if (!m) return null;
  var info = { name: m.name, type: m.intent, ctx: m.ctx || 0 };
  if (m.dmg !== undefined) {
    var base = typeof m.dmg === 'function' ? m.dmg(e, this) : m.dmg;
    info.dmg = this.enemyAttackDamage(e, base);
    info.hits = typeof m.hits === 'function' ? m.hits(e, this) : m.hits || 1;
  }
  return info;
};

// Total cards across piles (for invariant checks in tests).
C.cardCount = function () {
  return this.draw_.length + this.hand.length + this.discard.length + this.exhaust.length + this.powers.length;
};
