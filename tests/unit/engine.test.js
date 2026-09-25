import { describe, expect, it } from 'vitest';
import { BOSS_IDS, CARDS, ChapterMap, Combat, ENCOUNTERS, RNG, Run, cardView, newCard } from '../../src/game/index.js';

// A run with a fixed deck and boss, and a combat against the given enemies.
function setup(enemies, { boss = 'outage', deck, seed = 42 } = {}) {
  const run = Run.create('claude', seed);
  run.boss = boss;
  if (deck) run.deck = deck.map((id) => newCard(id));
  const c = new Combat(run, enemies, 'elite').start();
  return { run, c };
}

describe('RNG', () => {
  it('is deterministic for a seed', () => {
    const a = new RNG(7);
    const b = new RNG(7);
    expect([a.next(), a.next(), a.int(100)]).toEqual([b.next(), b.next(), b.int(100)]);
  });
});

describe('ChapterMap', () => {
  it('reaches every node from the start, and reachable() shrinks as you climb', () => {
    const map = ChapterMap.generate(new RNG(99));
    const all = map.nodes.flat().filter(Boolean);
    expect(Object.keys(ChapterMap.reachable(map, null)).length).toBe(all.length);
    const first = ChapterMap.available(map, null)[0];
    const later = ChapterMap.reachable(map, { row: first.row, col: first.col });
    expect(Object.keys(later).length).toBeLessThan(all.length);
    expect(later[`${first.row},${first.col}`]).toBeUndefined();
  });
});

describe('Run', () => {
  it('picks one of the three bosses and draws Incidents from that boss’s pool', () => {
    const run = Run.create('gpt', 123);
    expect(BOSS_IDS).toContain(run.boss);
    const pool = ENCOUNTERS.elites[run.boss].map((ids) => ids.join());
    for (let i = 0; i < 6; i++) expect(pool).toContain(Run.encounter(run, 'elite').join());
    expect(Run.encounter(run, 'boss')).toEqual([run.boss]);
  });

  it('loads saves from before bosses were randomised as the Outage', () => {
    const run = Run.create('gemini', 5);
    const json = JSON.parse(Run.serialize(run));
    delete json.boss;
    expect(Run.deserialize(JSON.stringify(json)).boss).toBe('outage');
  });
});

describe('Ransomware encryption', () => {
  it('raises cost by 1 until the card is played, and scales the Deadline', () => {
    const { c } = setup(['ransomware'], { boss: 'ransomware', deck: Array(10).fill('cl_critique') });
    expect(c.encryptCards(3, true)).toBe(3);
    expect(c.encryptedCount()).toBe(3);
    const idx = c.hand.findIndex((inst) => inst.enc);
    const inst = c.hand[idx];
    expect(cardView(inst).cost).toBe(CARDS.cl_critique.cost + 1);
    const energy = c.p.energy;
    expect(c.play(idx, c.enemies[0].uid)).toBe(true);
    expect(c.p.energy).toBe(energy - 2);
    expect(inst.enc).toBe(false);
    expect(c.encryptedCount()).toBe(2);
    const boss = c.enemies[0];
    boss.intent = 'detonate';
    expect(c.intentInfo(boss).dmg).toBe(6 + 2 * c.encryptedCount());
  });

  it('locks down at 50% HP and encrypts the whole next hand', () => {
    const { c } = setup(['ransomware'], { boss: 'ransomware', deck: Array(10).fill('cl_critique') });
    const boss = c.enemies[0];
    c.hitEnemy(boss, Math.ceil(boss.maxHp / 2) + 1);
    expect(boss.intent).toBe('lockdown');
    c.endTurn();
    expect(c.hand.length).toBeGreaterThan(0);
    expect(c.hand.every((inst) => inst.enc)).toBe(true);
  });
});

describe('Leaked API Key', () => {
  it('steals Credits, returns them when fixed', () => {
    const { run, c } = setup(['leaked_key'], { boss: 'ransomware' });
    const key = c.enemies[0];
    const before = run.credits;
    c.stealCredits(key, 15);
    expect(run.credits).toBe(before - 15);
    c.hitEnemy(key, 999);
    expect(run.credits).toBe(before);
  });

  it('escapes on its 5th turn without counting as fixed, and drops no Plugin', () => {
    const { run, c } = setup(['leaked_key'], { boss: 'ransomware' });
    const fixed = run.stats.bugsFixed;
    c.p.hp = 999;
    for (let i = 0; i < 5 && !c.over; i++) c.endTurn();
    expect(c.over).toBe(true);
    expect(c.result).toBe('win');
    expect(c.stats.escaped).toBe(1);
    expect(run.stats.bugsFixed).toBe(fixed);
    expect(Run.rewards(run, 'elite', c).plugin).toBeNull();
  });
});

describe('The Rogue Agent', () => {
  it('fills its own Context, hits harder when Deep, and hallucinates after overflowing', () => {
    const { c } = setup(['rogue_agent'], { boss: 'rogue_agent' });
    const agent = c.enemies[0];
    c.p.hp = 9999;
    const seen = [];
    for (let i = 0; i < 6; i++) {
      seen.push(agent.intent);
      c.endTurn();
    }
    expect(seen.slice(0, 5)).toEqual(['spam', 'leak', 'improve', 'replay', 'hallucinate']);
    agent.mem.ctx = 12;
    agent.intent = 'spam';
    const deep = c.intentInfo(agent).dmg;
    agent.mem.ctx = 0;
    expect(deep).toBeGreaterThan(c.intentInfo(agent).dmg);
  });

  it('Replay Attack scales with the cards you play this turn', () => {
    const { c } = setup(['rogue_agent'], { boss: 'rogue_agent', deck: Array(10).fill('cl_guardrail') });
    const agent = c.enemies[0];
    agent.intent = 'replay';
    const base = c.intentInfo(agent).dmg;
    c.play(0);
    c.play(0);
    expect(c.intentInfo(agent).dmg).toBe(base + 4);
  });
});

describe('Reward Hacker', () => {
  it('gains Guard when you play its current metric', () => {
    const { c } = setup(['reward_hacker'], { boss: 'rogue_agent', deck: Array(10).fill('cl_guardrail') });
    const e = c.enemies[0];
    e.mem.metric = 'skill';
    c.play(0);
    expect(e.block).toBe(4);
    e.mem.metric = 'attack';
    c.play(0);
    expect(e.block).toBe(4);
  });
});

describe('Paperclip Maximizer', () => {
  it('arrives with a Paperclip and grows stronger for each one alive', () => {
    const { c } = setup(['paperclip'], { boss: 'rogue_agent' });
    const max = c.enemies.find((e) => e.def.id === 'paperclip');
    expect(c.enemies.filter((e) => e.def.id === 'paperclip_minion').length).toBe(1);
    c.p.hp = 999;
    c.endTurn();
    expect(max.status.weights).toBeGreaterThanOrEqual(1);
  });
});

// A fresh turn for the given character with exactly these cards in hand.
function hand(char, ids) {
  const run = Run.create(char, 42);
  const c = new Combat(run, ['ransomware'], 'elite').start();
  c.hand = ids.map((id) => newCard(id));
  c.p.energy = 3;
  c.p.context = 0;
  c.enemies[0].hp = c.enemies[0].maxHp = 500;
  c.enemies[0].block = 0;
  return c;
}

describe('Llama Forks', () => {
  it('copies the last card played as a cheaper, Ethereal Fork that Exhausts', () => {
    const c = hand('llama', ['ll_generate', 'll_fork']);
    c.play(0);
    c.play(0);
    expect(c.hand).toHaveLength(1);
    const fork = cardView(c.hand[0]);
    expect([fork.id, fork.fork, fork.cost, fork.ethereal, fork.exhaust]).toEqual(['ll_generate', true, 0, true, true]);
    const before = c.enemies[0].hp;
    c.play(0);
    expect(c.enemies[0].hp).toBeLessThan(before);
    expect(c.forksPlayed).toBe(1);
    expect(c.exhaust.map((i) => i.id)).toContain('ll_generate');
  });

  it('Self-Replicate copies itself once: its Fork does not make another', () => {
    const c = hand('llama', ['ll_replicate']);
    c.play(0);
    expect(c.hand.map((i) => [i.id, !!i.fork])).toEqual([['ll_replicate', true]]);
    c.play(0);
    expect(c.hand).toHaveLength(0);
  });

  it('never copies a card that makes Forks, and forgets the last card each turn', () => {
    const c = hand('llama', ['ll_fork', 'll_fork']);
    c.play(0);
    c.play(0);
    expect(c.hand).toHaveLength(0);
    const d = hand('llama', ['ll_generate']);
    d.play(0);
    d.endTurn();
    expect(d.lastPlayed).toBeNull();
  });
});

describe('DeepSeek Switches', () => {
  it('counts an Attack after a Skill (or the reverse) as a Switch, and Sparse Activation trims Context', () => {
    const c = hand('deepseek', ['ds_coder', 'ds_coder', 'ds_align', 'ds_coder']);
    const hp = c.enemies[0].hp;
    c.play(0); // first card of the turn: no Switch
    expect(c.switchesTurn).toBe(0);
    expect(hp - c.enemies[0].hp).toBe(6);
    c.play(0); // Attack after Attack: no Switch
    expect(c.switchesTurn).toBe(0);
    c.play(0); // Skill after Attack: a Switch, and Sparse Activation trims 1 Context
    expect(c.switchesTurn).toBe(1);
    expect(c.p.context).toBe(2 + 2 + 1 - 1);
    const mid = c.enemies[0].hp;
    c.p.energy = 1;
    c.play(0); // Attack after Skill: Switch, +4 damage
    expect(c.switchesTurn).toBe(2);
    expect(mid - c.enemies[0].hp).toBe(10);
  });

  it('Thinking Toggle makes the next Attack or Skill a Switch', () => {
    const c = hand('deepseek', ['ds_toggle', 'ds_coder']);
    c.play(0);
    expect(c.wouldSwitch(cardView(c.hand[0]))).toBe(true);
    c.play(0);
    expect(c.switchesTurn).toBe(1);
  });
});

describe('Difficulty modes', () => {
  it('scale enemy HP and attack damage; old saves without a mode play as Standard', () => {
    const fight = (mode) => {
      const run = Run.create('claude', 42, mode);
      if (mode === undefined) delete run.mode;
      const c = new Combat(run, ['infinite_loop'], 'normal').start();
      return { hp: c.enemies[0].maxHp, dmg: c.enemyAttackDamage(c.enemies[0], 20) };
    };
    const std = fight('standard');
    expect(fight(undefined)).toEqual(std);
    const easy = fight('learning');
    const hard = fight('hard');
    expect(easy.hp).toBeLessThan(std.hp);
    expect(hard.hp).toBeGreaterThan(std.hp);
    expect([easy.dmg, std.dmg, hard.dmg]).toEqual([17, 20, 22]);
  });
});
