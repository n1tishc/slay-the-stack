// Headless balance simulation: plays full runs with bots and asserts engine invariants.
// Usage: npm run sim -- [runsPerChar=200] [bot=greedy|random] [mode=standard|learning|hard]
import * as SS from '../src/game/index.js';
import { checkMap, playRun } from '../tests/support/bot.js';

const RUNS = parseInt(process.argv[2] || '200', 10);
const BOT = process.argv[3] || 'greedy';
const MODE = process.argv[4] || 'standard';

let mapShops = 0;
let mapElites = 0;
for (let s = 1; s <= 300; s++) {
  const r = checkMap(s * 7919);
  mapShops += r.shops;
  mapElites += r.elites;
}
console.log(`maps ok: avg shops ${(mapShops / 300).toFixed(1)}, avg elites ${(mapElites / 300).toFixed(1)}`);

const byBoss = {};
for (const ch of Object.keys(SS.CHARACTERS)) {
  let wins = 0;
  let bossReached = 0;
  let hall = 0;
  let floors = 0;
  const deaths = {};
  for (let i = 0; i < RUNS; i++) {
    const res = playRun(ch, 1000 + i * 31, BOT, MODE);
    const b = (byBoss[res.boss] = byBoss[res.boss] || { runs: 0, reached: 0, wins: 0, eliteDeaths: 0 });
    b.runs++;
    if (res.bossReached) b.reached++;
    if (res.result === 'win') b.wins++;
    b.eliteDeaths += res.eliteDeaths;
    if (res.result === 'win') wins++;
    if (res.bossReached) bossReached++;
    hall += res.hallucinations;
    floors += res.floor;
    if (res.diedTo) deaths[res.diedTo] = (deaths[res.diedTo] || 0) + 1;
  }
  const topDeaths = Object.entries(deaths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}:${v}`)
    .join('  ');
  console.log(
    `${ch.padEnd(7)} win ${((wins / RUNS) * 100).toFixed(0)}%  boss reached ${((bossReached / RUNS) * 100).toFixed(0)}%  avg floor ${(floors / RUNS).toFixed(1)}  hallucinations/run ${(hall / RUNS).toFixed(1)}\n         deaths: ${topDeaths}`,
  );
}
for (const [boss, b] of Object.entries(byBoss).sort()) {
  const pct = (n, d) => (d ? ((n / d) * 100).toFixed(0) : '0') + '%';
  console.log(
    `boss ${boss.padEnd(12)} runs ${String(b.runs).padStart(4)}  reached ${pct(b.reached, b.runs).padStart(4)}  beaten when reached ${pct(b.wins, b.reached).padStart(4)}  run win ${pct(b.wins, b.runs).padStart(4)}  elite deaths ${pct(b.eliteDeaths, b.runs)}`,
  );
}
console.log('all invariants held');
