// Headless bots that play full runs through the game engine, asserting invariants as they go.
// Shared by the balance simulator (scripts/sim.js) and the unit tests.
import * as SS from '../../src/game/index.js';

function assert(cond, msg) {
  if (!cond) throw new Error('Invariant failed: ' + msg);
}

function checkInvariants(c, run) {
  assert(c.p.block >= 0, 'player block >= 0');
  assert(c.p.energy >= 0, 'energy >= 0');
  assert(c.p.context >= 0, 'context >= 0');
  assert(c.p.hp >= 0, 'hp >= 0');
  assert(c.over || c.p.context <= c.p.maxContext, 'context <= max outside overflow: ' + c.p.context + '/' + c.p.maxContext);
  assert(c.hand.length <= 10, 'hand <= 10');
  c.enemies.forEach((e) => {
    assert(e.block >= 0, 'enemy block >= 0');
    if (e.alive) assert(e.hp > 0, 'alive enemy has hp');
  });
  assert(c.cardCount() === run.deck.length + c.generated, 'card count ' + c.cardCount() + ' vs ' + (run.deck.length + c.generated));
}

// Score how much the bot likes a card right now.
function scoreCard(c, view) {
  const ctxAfter = c.p.context + c.tokensFor(view);
  const overflow = ctxAfter > c.p.maxContext && view.id !== 'compact';
  if (overflow) return -100;
  let s = 0;
  const incoming = c.enemiesAlive().reduce((a, e) => {
    const i = c.intentInfo(e);
    return a + (i && i.dmg ? i.dmg * i.hits : 0);
  }, 0);
  const needBlock = Math.max(0, incoming - c.p.block);
  // A Practice that counters a living failure mode cancels its next move: worth a lot.
  const counters = c.enemiesAlive().some((e) => e.def.weakness === view.id && !e.mem.caught);
  if (counters) return 60;
  if (view.id === 'compact') return c.p.context >= c.p.maxContext * 0.6 ? 50 : -1;
  if (view.type === 'power') s += 30;
  if (view.type === 'attack') s += 20 + (view.v.dmg || 0);
  if (view.type === 'skill') s += view.v.blk ? (needBlock > 0 ? 25 + view.v.blk : 5) : 15;
  if (view.type === 'status') s += 1;
  if (view.cost === 0) s += 5;
  // Llama: a Fork with nothing to copy is wasted. DeepSeek: prefer the cards that Switch.
  if (view.def.forker && view.id !== 'll_zoo' && !c.lastPlayed) return 0;
  if (view.id === 'll_merge' && !c.forksInHand()) s -= 20;
  if (SS.CHARACTERS[c.run.char].showSwitch && c.wouldSwitch(view)) s += 6;
  return s;
}

function botTurn(c, run, bot) {
  let guard = 0;
  while (!c.over && guard++ < 50) {
    // Scripts when low.
    if (run.scripts.length && c.p.hp < c.p.maxHp * 0.4) {
      const t = c.enemiesAlive()[0];
      c.useScript(0, t && t.uid);
      checkInvariants(c, run);
      continue;
    }
    const playable = c.hand.map((inst, i) => i).filter((i) => c.canPlay(i));
    if (!playable.length) break;
    let idx;
    if (bot === 'random') {
      idx = playable[Math.floor(Math.random() * playable.length)];
      if (Math.random() < 0.15) break;
    } else {
      let best = -1;
      let bestScore = 0;
      for (const i of playable) {
        const sc = scoreCard(c, SS.cardView(c.hand[i]));
        if (sc > bestScore) {
          bestScore = sc;
          best = i;
        }
      }
      if (best < 0) break;
      idx = best;
    }
    const alive = c
      .enemiesAlive()
      .slice()
      .sort((a, b) => !!a.def.minion - !!b.def.minion || a.hp - b.hp);
    const ok = c.play(idx, alive[0] && alive[0].uid);
    assert(ok, 'play returned false for playable card');
    checkInvariants(c, run);
  }
  // Hitting the cap means an infinite combo, not a long turn.
  assert(guard <= 50, 'more than 50 plays in one turn: an infinite combo?');
  if (!c.over) {
    c.endTurn();
    checkInvariants(c, run);
  }
}

function fight(run, kind, bot) {
  const ids = SS.Run.encounter(run, kind);
  const c = new SS.Combat(run, ids, kind).start();
  checkInvariants(c, run);
  while (!c.over) {
    botTurn(c, run, bot);
    assert(c.turn < 60, 'combat too long vs ' + ids.join(','));
  }
  SS.Run.finishCombat(run, c);
  return { c, ids };
}

export function playRun(charId, seed, bot = 'greedy', mode = 'standard') {
  const run = SS.Run.create(charId, seed, mode);
  const rng = SS.Run.rng(run);
  const log = { char: charId, boss: run.boss, result: null, floor: 0, diedTo: null, hallucinations: 0, bossReached: false, eliteDeaths: 0 };
  let pos = null;
  for (;;) {
    const avail = SS.ChapterMap.available(run.map, pos);
    assert(avail.length > 0, 'map has a next node');
    // Prefer combat-ish nodes early, rest when hurt.
    let node = rng.pick(avail);
    const rest = avail.find((n) => n.type === 'rest');
    if (rest && run.hp < run.maxHp * 0.5) node = rest;
    pos = node.boss ? { boss: true } : { row: node.row, col: node.col };
    log.floor++;
    const t = node.type;
    if (t === 'combat' || t === 'elite' || t === 'boss') {
      if (t === 'boss') log.bossReached = true;
      const { c, ids } = fight(run, t === 'combat' ? 'normal' : t, bot);
      log.hallucinations += c.stats.hallucinations;
      if (c.result === 'lose') {
        log.result = 'lose';
        log.diedTo = ids.join('+');
        if (t === 'elite') log.eliteDeaths++;
        return log;
      }
      if (t === 'boss') {
        log.result = 'win';
        return log;
      }
      const r = SS.Run.rewards(run, t === 'combat' ? 'normal' : t, c);
      run.credits += r.credits;
      if (r.script) SS.Run.addScript(run, r.script);
      if (r.plugin) SS.Run.addPlugin(run, r.plugin);
      r.lessons.forEach((id) => SS.Run.addCard(run, id));
      const pickPref = r.cards.find((id) => SS.CARDS[id].rarity !== 'common') || r.cards[0];
      if (rng.chance(0.85)) SS.Run.addCard(run, pickPref);
    } else if (t === 'rest') {
      if (run.hp < run.maxHp * 0.7) SS.Run.heal(run, Math.floor(run.maxHp * 0.3));
      else SS.Run.upgradeRandom(run, rng);
    } else if (t === 'shop') {
      const shop = SS.Run.shop(run);
      if (run.credits >= run.removeCost) {
        const basic = run.deck.find((cd) => SS.CARDS[cd.id].rarity === 'basic' && SS.CARDS[cd.id].type === 'attack');
        if (basic) {
          run.credits -= run.removeCost;
          SS.Run.removeCard(run, basic.uid);
          run.removeCost += 25;
        }
      }
      for (const it of shop.cards)
        if (run.credits >= it.price) {
          run.credits -= it.price;
          SS.Run.addCard(run, it.id);
          break;
        }
      for (const it of shop.plugins)
        if (run.credits >= it.price) {
          run.credits -= it.price;
          SS.Run.addPlugin(run, it.id);
          break;
        }
    } else if (t === 'event') {
      // Scenarios: the bot answers at random, so it gets the best call about a third of the time.
      const ev = SS.Run.pickEvent(run);
      const res = SS.Run.answerScenario(run, ev, rng.int(ev.options.length));
      assert(['best', 'ok', 'bad'].includes(res.grade), 'scenario has a grade');
      if (res.action?.type === 'upgrade') SS.Run.upgradeRandom(run, rng);
    } else if (t === 'treasure') {
      const p = SS.Run.randomPlugin(run, rng);
      if (p) SS.Run.addPlugin(run, p);
    }
    assert(run.hp > 0 && run.hp <= run.maxHp, 'run hp in range ' + run.hp + '/' + run.maxHp);
    // Save/load round-trip every node.
    const copy = SS.Run.deserialize(SS.Run.serialize(run));
    assert(copy.deck.length === run.deck.length, 'serialize round-trip');
  }
}

// Map sanity: every node reachable and leads to the last row.
export function checkMap(seed) {
  const map = SS.ChapterMap.generate(new SS.RNG(seed));
  const reach = new Set();
  map.nodes[0].forEach((n) => n && reach.add('0,' + n.col));
  for (let r = 0; r < map.rows; r++)
    for (const n of map.nodes[r]) {
      if (!n) continue;
      assert(reach.has(r + ',' + n.col), 'node reachable r' + r + ' c' + n.col);
      if (r < map.rows - 1) assert(n.next.length > 0, 'node has children');
      n.next.forEach((c) => reach.add(r + 1 + ',' + c));
      assert(n.type, 'node typed');
    }
  const types = map.nodes
    .flat()
    .filter(Boolean)
    .map((n) => n.type);
  return { shops: types.filter((t) => t === 'shop').length, elites: types.filter((t) => t === 'elite').length };
}
