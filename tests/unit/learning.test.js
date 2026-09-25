import { describe, expect, it } from 'vitest';
import { CARDS, Combat, ENCOUNTERS, ENEMIES, FAILURES, FIRST_ENCOUNTER, Run, countersOf, newCard } from '../../src/game/index.js';

function setup(enemies, deck) {
  const run = Run.create('claude', 42);
  run.deck = deck.map((id) => newCard(id));
  const c = new Combat(run, enemies, 'normal').start();
  return { run, c };
}

// Puts a card in hand slot 0 and plays it.
function playNew(c, id, target) {
  c.hand.unshift(newCard(id));
  c.p.energy = 3;
  expect(c.play(0, target?.uid)).toBe(true);
}

describe('Field Guide data', () => {
  it('gives every failure mode a lesson, a tier and a Practice card that exists', () => {
    expect(FAILURES.length).toBeGreaterThanOrEqual(10);
    FAILURES.forEach((def) => {
      expect(CARDS[def.weakness], def.id).toBeDefined();
      expect([1, 2, 3]).toContain(def.tier);
      ['sign', 'why', 'fix', 'example'].forEach((k) => expect(def.lesson[k], `${def.id}.${k}`).toBeTruthy());
    });
    expect(countersOf('pr_approve').map((d) => d.id)).toEqual(['destructive_cmd']);
  });

  it('only uses real enemies in the encounter pools, and each tier matches its pool', () => {
    const tierOf = { easy: 1, medium: 2, hard: 3 };
    Object.entries(tierOf).forEach(([pool, tier]) => {
      ENCOUNTERS[pool].forEach((ids) => {
        ids.forEach((id) => expect(ENEMIES[id], id).toBeDefined());
        // Every fight introduces at most this tier; earlier tiers may come back as a sidekick.
        expect(Math.max(...ids.map((id) => ENEMIES[id].tier))).toBe(tier);
      });
    });
  });
});

describe('Learning curve', () => {
  it('opens with Context Rot, then draws beginner, workflow and security fights in order', () => {
    const run = Run.create('gpt', 7);
    expect(Run.encounter(run, 'normal')).toEqual(FIRST_ENCOUNTER);
    const tiers = [];
    for (let i = 1; i < 7; i++) tiers.push(Math.max(...Run.encounter(run, 'normal').map((id) => ENEMIES[id].tier)));
    expect(tiers).toEqual([1, 2, 2, 3, 3, 3]);
  });
});

describe('Counters', () => {
  it('cancel exactly one move, leave the enemy Exposed and still advance its cycle', () => {
    const { c } = setup(['destructive_cmd'], Array(10).fill('cl_guardrail'));
    const e = c.enemies[0];
    c.endTurn();
    c.endTurn();
    expect(e.intent).toBe('wipe');
    const hp = c.p.hp;
    playNew(c, 'pr_approve');
    expect(e.mem.caught).toBe(true);
    expect(e.status.exposed).toBe(2);
    expect(c.intentInfo(e).type).toBe('caught');
    c.endTurn();
    expect(c.p.hp).toBe(hp); // rm -rf never ran
    expect(e.history).toEqual(['scan', 'plan', 'wipe']);
    expect(e.intent).toBe('scan'); // not simply retried
    expect(c.stats.countered).toBe(1);
  });

  it('only counter the failure modes weak to that card', () => {
    const { c } = setup(['sycophancy', 'vague_prompt'], Array(10).fill('cl_guardrail'));
    playNew(c, 'pr_specific');
    expect(c.enemies.map((e) => !!e.mem.caught)).toEqual([false, true]);
  });

  it('let a pending split wait for the next turn instead of losing it', () => {
    const { c } = setup(['scope_creep'], Array(10).fill('cl_guardrail'));
    const e = c.enemies[0];
    c.hitEnemy(e, e.hp - Math.floor(e.maxHp / 2));
    expect(e.intent).toBe('split');
    playNew(c, 'pr_commit');
    c.endTurn();
    expect(e.alive).toBe(true);
    expect(e.intent).toBe('split');
    c.endTurn();
    expect(e.alive).toBe(false);
    expect(c.enemiesAlive().map((x) => x.def.id)).toEqual(['unrelated_change', 'unrelated_change']);
  });

  it('/compact counters Context Rot, so the first fight teaches a counter you already hold', () => {
    const { c } = setup(FIRST_ENCOUNTER, Array(10).fill('cl_guardrail'));
    playNew(c, 'compact');
    expect(c.enemies[0].mem.caught).toBe(true);
  });
});

describe('Lessons', () => {
  it('offer the Practice for each failure fought, once, and skip ones already in the deck', () => {
    const { run, c } = setup(
      ['sycophancy', 'outdated_api', 'outdated_api', 'context_rot'],
      ['cl_critique', 'pr_devil', 'pr_docs', 'compact'],
    );
    expect(Run.lessons(run, c)).toEqual([]);
    run.deck = run.deck.filter((card) => card.id !== 'pr_devil');
    expect(Run.lessons(run, c)).toEqual(['pr_devil']);
  });

  it('Read the Docs clears Warnings from your hand', () => {
    const { c } = setup(['outdated_api'], Array(10).fill('cl_guardrail'));
    c.addToHand('warning', 2);
    const total = c.cardCount();
    playNew(c, 'pr_docs');
    expect(c.hand.some((inst) => inst.id === 'warning')).toBe(false);
    expect(c.cardCount()).toBe(total + 1); // only the Practice itself was added
  });
});

describe('Scenarios', () => {
  it('each have one best, one risky and one bad call, and teach a real failure mode', async () => {
    const { EVENTS } = await import('../../src/game/index.js');
    expect(EVENTS.length).toBeGreaterThanOrEqual(10);
    EVENTS.forEach((ev) => {
      expect(ev.options.map((o) => o.grade).sort(), ev.id).toEqual(['bad', 'best', 'ok']);
      ev.options.forEach((o) => expect(o.why, ev.id).toBeTruthy());
      if (ev.failure) expect(ENEMIES[ev.failure].lesson, ev.id).toBeDefined();
    });
  });

  it('reward a best call with Credits and the Practice, and build a streak', async () => {
    const { EVENTS } = await import('../../src/game/index.js');
    const run = Run.create('claude', 3);
    const ev = EVENTS.find((e) => e.failure === 'ghost_package');
    const best = ev.options.findIndex((o) => o.grade === 'best');
    const credits = run.credits;
    const r1 = Run.answerScenario(run, ev, best);
    expect(r1.practice).toBe('pr_verify');
    expect(run.deck.some((c) => c.id === 'pr_verify')).toBe(true);
    const r2 = Run.answerScenario(run, ev, best);
    expect(r2.action).toEqual({ type: 'upgrade' }); // already has the Practice
    expect(run.credits).toBe(credits + 40 + 55);
    expect(run.stats).toMatchObject({ calls: 2, bestCalls: 2, streak: 2 });
  });

  it('punish a bad call without killing you, and reset the streak', async () => {
    const { EVENTS } = await import('../../src/game/index.js');
    const run = Run.create('gpt', 3);
    run.hp = 3;
    run.stats.streak = 4;
    const ev = EVENTS.find((e) => e.options.some((o) => o.debt));
    const bad = ev.options.findIndex((o) => o.grade === 'bad');
    const r = Run.answerScenario(run, ev, bad);
    expect(r.grade).toBe('bad');
    expect(r.best).toBe(ev.options.find((o) => o.grade === 'best').label);
    expect(run.hp).toBe(1);
    expect(run.stats.streak).toBe(0);
    expect(run.deck.some((c) => c.id === 'techdebt')).toBe(true);
    expect(run.calls).toEqual([{ id: ev.id, grade: 'bad' }]);
  });

  it('bring back a call missed in an earlier run, every other scenario, then prefer new ones', async () => {
    const { EVENTS } = await import('../../src/game/index.js');
    const [missed, done] = EVENTS;
    const past = Object.fromEntries(EVENTS.map((e) => [e.id, 'best']));
    past[missed.id] = 'bad';
    delete past[done.id]; // never answered
    for (let seed = 1; seed <= 20; seed++) {
      const run = Run.create('claude', seed);
      expect(Run.pickEvent(run, past).id).toBe(missed.id);
      expect(Run.pickEvent(run, past).id).toBe(done.id);
      expect([missed.id, done.id]).not.toContain(Run.pickEvent(run, past).id);
    }
    // Without any history it still deals every scenario once before repeating.
    const run = Run.create('claude', 5);
    const ids = EVENTS.map(() => Run.pickEvent(run).id);
    expect(new Set(ids).size).toBe(EVENTS.length);
  });

  it('record the failure modes met in a run and which were new', () => {
    const run = Run.create('claude', 1);
    Run.meet(run, ['sycophancy', 'vague_prompt'], ['vague_prompt']);
    Run.meet(run, ['sycophancy'], []);
    expect(run.met).toEqual(['sycophancy', 'vague_prompt']);
    expect(run.found).toEqual(['vague_prompt']);
  });
});
