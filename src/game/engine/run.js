// Run state (plain JSON-able object) and the helpers that mutate it between combats.

import { reserveUids } from '../core/ids.js';
import { RNG } from '../core/rng.js';
import { CARDS, canUpgrade, cardPool, newCard } from '../data/cards/index.js';
import { CHARACTERS } from '../data/characters.js';
import { ENEMIES } from '../data/enemies/index.js';
import { BOSS_IDS, ENCOUNTERS, FIRST_ENCOUNTER } from '../data/encounters.js';
import { EVENTS } from '../data/events.js';
import { PLUGINS, pluginPool } from '../data/plugins.js';
import { SCRIPTS } from '../data/scripts.js';
import { ChapterMap } from './map.js';

export const Run = {
  create: function (charId, seed, mode) {
    var ch = CHARACTERS[charId];
    seed = seed === undefined ? (Date.now() ^ (Math.random() * 1e9)) >>> 0 : seed;
    var run = {
      version: 1,
      seed: seed,
      rngState: seed,
      char: charId,
      mode: mode || 'standard', // difficulty (data/modes.js)
      hp: ch.hp,
      maxHp: ch.hp,
      credits: 99,
      deck: ch.deck.map(function (id) {
        return newCard(id);
      }),
      plugins: [],
      scripts: [],
      maxScripts: 3,
      map: null,
      pos: null,
      removeCost: 75,
      circuitUsed: false,
      normalFights: 0,
      lastEncounter: null,
      seenEvents: [],
      calls: [], // { id, grade } for each scenario answered this run (the end-of-run recap)
      met: [], // failure modes met this run; found: the ones that were new to the Field Guide
      found: [],
      stats: { bugsFixed: 0, hallucinations: 0, floors: 0, calls: 0, bestCalls: 0, streak: 0 },
    };
    Run.addPlugin(run, ch.plugin);
    run.map = ChapterMap.generate(Run.rng(run));
    // The chapter boss is known from the start, like Slay the Spire's boss icon.
    run.boss = Run.rng(run).pick(BOSS_IDS);
    return run;
  },

  // The live RNG is cached on the run (underscore keys are skipped when saving).
  rng: function (run) {
    if (!run._rng) run._rng = new RNG(run.rngState);
    return run._rng;
  },

  serialize: function (run) {
    run.rngState = Run.rng(run).state;
    return JSON.stringify(run, function (k, v) {
      return k.charAt(0) === '_' ? undefined : v;
    });
  },
  deserialize: function (json) {
    var run = JSON.parse(json);
    var maxUid = 0;
    run.deck.forEach(function (c) {
      maxUid = Math.max(maxUid, c.uid);
    });
    reserveUids(maxUid);
    if (!run.boss) run.boss = 'outage'; // saves from before bosses were randomised
    return run;
  },

  heal: function (run, n) {
    run.hp = Math.min(run.maxHp, run.hp + n);
  },
  // Out-of-combat damage never kills (events stay non-lethal).
  damage: function (run, n) {
    run.hp = Math.max(1, run.hp - n);
  },

  addCard: function (run, id, up) {
    var c = newCard(id, up);
    run.deck.push(c);
    return c;
  },
  removeCard: function (run, uid) {
    run.deck = run.deck.filter(function (c) {
      return c.uid !== uid;
    });
  },
  upgradeCard: function (run, uid) {
    run.deck.forEach(function (c) {
      if (c.uid === uid && canUpgrade(c)) c.up = true;
    });
  },
  upgradeRandom: function (run, rng) {
    var cands = run.deck.filter(canUpgrade);
    if (!cands.length) return null;
    var c = rng.pick(cands);
    c.up = true;
    return c;
  },

  rollRarity: function (rng, kind) {
    var rare = kind === 'elite' ? 10 : 3;
    var unc = kind === 'elite' ? 40 : 37;
    return rng.weighted([
      ['rare', rare],
      ['uncommon', unc],
      ['common', 100 - rare - unc],
    ]);
  },
  randomCard: function (run, rng, rarity) {
    var pool = cardPool(run.char, rarity || Run.rollRarity(rng));
    return rng.pick(pool);
  },
  cardChoices: function (run, rng, kind, n) {
    var out = [];
    var guard = 0;
    while (out.length < (n || 3) && guard++ < 100) {
      var id = rng.pick(cardPool(run.char, Run.rollRarity(rng, kind)));
      if (out.indexOf(id) < 0) out.push(id);
    }
    return out;
  },

  randomPlugin: function (run, rng, rarity) {
    var order = rarity
      ? [rarity]
      : [
          rng.weighted([
            ['common', 50],
            ['uncommon', 33],
            ['rare', 17],
          ]),
        ];
    order = order.concat(['common', 'uncommon', 'rare']);
    for (var i = 0; i < order.length; i++) {
      var pool = pluginPool(run, order[i]);
      if (pool.length) return rng.pick(pool);
    }
    return null;
  },
  addPlugin: function (run, id) {
    if (run.plugins.indexOf(id) >= 0) return;
    run.plugins.push(id);
    var p = PLUGINS[id];
    if (p.onPickup) p.onPickup(run);
  },
  addScript: function (run, id) {
    if (run.scripts.length >= run.maxScripts) return false;
    run.scripts.push(id);
    return true;
  },
  randomScript: function (rng) {
    return rng.pick(Object.keys(SCRIPTS));
  },

  encounter: function (run, kind) {
    var rng = Run.rng(run);
    var pool;
    if (kind === 'boss') pool = [[run.boss]];
    else if (kind === 'elite') pool = ENCOUNTERS.elites[run.boss];
    else pool = Run.normalPool(run.normalFights);
    if (kind === 'normal' && run.normalFights === 0) pool = [FIRST_ENCOUNTER];
    var key;
    var pick;
    var tries = 0;
    do {
      pick = rng.pick(pool);
      key = pick.join(',');
    } while (key === run.lastEncounter && pool.length > 1 && tries++ < 10);
    run.lastEncounter = key;
    if (kind === 'normal') run.normalFights++;
    return pick;
  },

  // The learning curve: which pool the nth normal fight (0-based) draws from.
  normalPool: function (n) {
    if (n < 2) return ENCOUNTERS.easy;
    if (n < 4) return ENCOUNTERS.medium;
    return ENCOUNTERS.hard;
  },

  // Practice cards that counter the failure modes in a finished combat, minus ones already in the deck.
  lessons: function (run, c) {
    var out = [];
    c.enemies.forEach(function (e) {
      var id = e.def.weakness;
      if (!id || out.indexOf(id) >= 0) return;
      if (
        run.deck.some(function (card) {
          return card.id === id;
        })
      )
        return;
      out.push(id);
    });
    return out;
  },

  // Sync the result of a finished combat back into the run.
  finishCombat: function (run, c) {
    run.hp = Math.max(0, c.p.hp);
    if (c.result !== 'win') return;
    run.plugins.forEach(function (id) {
      var p = PLUGINS[id];
      if (p.onCombatEnd) p.onCombatEnd(run);
    });
  },

  // c: the finished Combat. An Incident that escaped drops no Plugin.
  rewards: function (run, kind, c) {
    var rng = Run.rng(run);
    var r = {
      credits: 0,
      cards: null,
      script: null,
      plugin: null,
      escaped: !!(c && c.stats.escaped),
      lessons: c ? Run.lessons(run, c) : [],
    };
    if (kind === 'boss') return r;
    r.credits = kind === 'elite' ? rng.range(25, 35) : rng.range(10, 20);
    r.cards = Run.cardChoices(run, rng, kind, 3);
    if (rng.chance(kind === 'elite' ? 0.6 : 0.4)) r.script = Run.randomScript(rng);
    if (kind === 'elite' && !r.escaped) r.plugin = Run.randomPlugin(run, rng);
    return r;
  },

  shop: function (run) {
    var rng = Run.rng(run);
    var cardPrice = { common: [45, 55], uncommon: [68, 82], rare: [135, 165] };
    var plugPrice = { common: [110, 130], uncommon: [150, 170], rare: [200, 230] };
    var ids = Run.cardChoices(run, rng, 'shop', 5);
    var cards = ids.map(function (id) {
      var pr = cardPrice[CARDS[id].rarity];
      return { id: id, price: rng.range(pr[0], pr[1]), sold: false };
    });
    var sale = rng.pick(cards);
    sale.price = Math.floor(sale.price / 2);
    sale.sale = true;
    var plugins = [];
    for (var i = 0; i < 3; i++) {
      var pid = Run.randomPlugin(run, rng);
      if (
        !pid ||
        plugins.some(function (x) {
          return x.id === pid;
        })
      )
        continue;
      var pp = plugPrice[PLUGINS[pid].rarity];
      plugins.push({ id: pid, price: rng.range(pp[0], pp[1]), sold: false });
    }
    var scripts = [];
    var sids = rng.shuffle(Object.keys(SCRIPTS).slice()).slice(0, 3);
    sids.forEach(function (sid) {
      scripts.push({ id: sid, price: rng.range(45, 70), sold: false });
    });
    return { cards: cards, plugins: plugins, scripts: scripts, removeUsed: false };
  },

  // past: { scenarioId: grade of its last answer, in any run } (settings.js keeps it).
  // Every other scenario (the 1st, 3rd, …) is a retry of one missed before, when there is one:
  // coming back to a mistake later is what makes the lesson stick. The rest prefer scenarios
  // never answered, then any not yet seen this run.
  pickEvent: function (run, past) {
    past = past || {};
    var rng = Run.rng(run);
    var fresh = EVENTS.filter(function (e) {
      return run.seenEvents.indexOf(e.id) < 0;
    });
    var pool = fresh.length ? fresh : EVENTS;
    var missed = pool.filter(function (e) {
      return past[e.id] && past[e.id] !== 'best';
    });
    var unanswered = pool.filter(function (e) {
      return !past[e.id];
    });
    var retryTurn = run.seenEvents.length % 2 === 0;
    var ev = rng.pick(retryTurn && missed.length ? missed : unanswered.length ? unanswered : pool);
    run.seenEvents.push(ev.id);
    return ev;
  },

  // Records the failure modes in a fight or scenario; fresh ones were new to the Field Guide.
  meet: function (run, ids, fresh) {
    run.met = run.met || [];
    run.found = run.found || [];
    ids.forEach(function (id) {
      if (run.met.indexOf(id) < 0) run.met.push(id);
    });
    (fresh || []).forEach(function (id) {
      if (run.found.indexOf(id) < 0) run.found.push(id);
    });
  },

  // Resolves a "what would you do?" answer. Rewards come from the grade:
  //   best: Credits (more for a streak of best calls) and the failure's Practice card,
  //         or a card upgrade if you already have it
  //   ok:   a few Credits
  //   bad:  lose HP (never lethal), plus Tech Debt for the worst calls
  // Returns { grade, why, best, lines: [outcome text], action? } for the UI.
  answerScenario: function (run, ev, idx) {
    var opt = ev.options[idx];
    var s = run.stats;
    s.calls = (s.calls || 0) + 1;
    (run.calls = run.calls || []).push({ id: ev.id, grade: opt.grade });
    var out = {
      grade: opt.grade,
      why: opt.why,
      best: ev.options.filter(function (o) {
        return o.grade === 'best';
      })[0].label,
      lines: [],
      action: null,
    };
    if (opt.grade === 'best') {
      s.bestCalls = (s.bestCalls || 0) + 1;
      s.streak = (s.streak || 0) + 1;
      var credits = 40 + 15 * (s.streak - 1);
      run.credits += credits;
      out.lines.push('+' + credits + ' Credits' + (s.streak > 1 ? ' (streak ×' + s.streak + ')' : ''));
      var practice = ev.failure && ENEMIES[ev.failure].weakness;
      var owned = run.deck.some(function (c) {
        return c.id === practice;
      });
      if (practice && !owned) {
        Run.addCard(run, practice);
        out.practice = practice;
        out.lines.push('New Practice card: ' + CARDS[practice].name);
      } else if (run.deck.some(canUpgrade)) {
        out.action = { type: 'upgrade' };
        out.lines.push('Upgrade a card');
      }
    } else if (opt.grade === 'ok') {
      s.streak = 0;
      run.credits += 20;
      out.lines.push('+20 Credits');
    } else {
      s.streak = 0;
      Run.damage(run, 8);
      out.lines.push('−8 HP');
      if (opt.debt) {
        Run.addCard(run, 'techdebt');
        out.lines.push('Tech Debt card added');
      }
    }
    return out;
  },
};
