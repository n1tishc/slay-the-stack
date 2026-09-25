import { describe, expect, it } from 'vitest';
import { BOSS_IDS, CHARACTERS } from '../../src/game/index.js';
import { checkMap, playRun } from '../support/bot.js';

// Bots play whole runs; every step asserts engine invariants (see tests/support/bot.js).
describe('full-run simulation', () => {
  it('generates valid maps', () => {
    for (let s = 1; s <= 50; s++) checkMap(s * 7919);
  });

  for (const ch of Object.keys(CHARACTERS)) {
    it(`${ch}: greedy and random bots finish runs without breaking invariants`, () => {
      const bosses = new Set();
      for (let i = 0; i < 30; i++) {
        const res = playRun(ch, 5000 + i * 17, i % 2 ? 'random' : 'greedy');
        expect(['win', 'lose']).toContain(res.result);
        bosses.add(res.boss);
      }
      expect([...bosses].every((b) => BOSS_IDS.includes(b))).toBe(true);
    });
  }
});
