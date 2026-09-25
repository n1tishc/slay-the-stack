// Plugins (relics): passive effects that last the whole run.
import { Run } from '../engine/run.js';

// Hooks: onPickup(run), onCombatStart(c), onTurnStart(c), onTurnEnd(c), onCardPlayed(c, view),
// onEnemyDeath(c, e), onCombatEnd(run). Flags are read directly by the engine.
export const PLUGINS = {
  constitution: {
    name: 'Constitution', icon: '📜', rarity: 'starter',
    desc: 'At the end of each combat, heal 6 HP.',
    onCombatEnd: function (run) { Run.heal(run, 6); },
  },
  function_calling: {
    name: 'Function Calling', icon: '🔧', rarity: 'starter',
    desc: 'At the start of each combat, add 3 Tool Calls to your hand.',
    onCombatStart: function (c) { c.addToHand('toolcall', 3); },
  },
  long_context: {
    name: 'Long Context', icon: '🌌', rarity: 'starter',
    desc: 'Deep Context triggers at 60% of max Context instead of 70%.',
    deepThreshold: 0.6,
  },
  open_weights: {
    name: 'Open Weights', icon: '🔓', rarity: 'starter',
    desc: 'At the start of each combat, Fine-tune a random card in your hand for that combat.',
    onTurnStart: function (c) { if (c.turn === 1) c.upgradeInHand(1); },
  },
  sparse_activation: {
    name: 'Sparse Activation', icon: '✨', rarity: 'starter',
    desc: 'Whenever you play a Switch, reduce Context by 1.',
    onCardPlayed: function (c) { if (c.switching) c.changeContext(-1); },
  },
  rubber_duck: {
    name: 'Rubber Duck', icon: '🦆', rarity: 'common',
    desc: 'Draw 2 additional cards on the first turn of each combat.',
    firstTurnDraw: 2,
  },
  linter: {
    name: 'Linter', icon: '🧹', rarity: 'common',
    desc: 'At the start of each combat, apply 1 Exposed to ALL enemies.',
    onCombatStart: function (c) { c.applyAll('exposed', 1); },
  },
  unit_tests: {
    name: 'Unit Tests', icon: '✅', rarity: 'common',
    desc: 'At the start of each combat, gain 10 Guard.',
    onCombatStart: function (c) { c.p.block += 10; },
  },
  prompt_cache: {
    name: 'Prompt Cache', icon: '💾', rarity: 'uncommon',
    desc: 'The first card you play each turn adds 0 tokens.',
    firstCardFree: true,
  },
  rag_index: {
    name: 'RAG Index', icon: '🗂️', rarity: 'common',
    desc: '+8 max Context.',
    contextBonus: 8,
  },
  coffee: {
    name: 'Coffee Mug', icon: '☕', rarity: 'common',
    desc: 'Raise your max HP by 10.',
    onPickup: function (run) { run.maxHp += 10; run.hp += 10; },
  },
  so_tab: {
    name: 'Stack Overflow Tab', icon: '📑', rarity: 'uncommon',
    desc: 'Every 3rd Attack you play each turn draws 1 card.',
    onCardPlayed: function (c, view) {
      if (view.type === 'attack' && c.attacksPlayedTurn % 3 === 0) c.draw(1);
    },
  },
  load_balancer: {
    name: 'Load Balancer', icon: '⚖️', rarity: 'common',
    desc: 'If you end your turn with 0 Guard, gain 6 Guard.',
    onTurnEnd: function (c) { if (c.p.block === 0) c.p.block += 6; },
  },
  circuit_breaker: {
    name: 'Circuit Breaker', icon: '🔌', rarity: 'rare',
    desc: 'Once per run, when you would go down, heal to 30% max HP instead.',
  },
  garbage_collector: {
    name: 'Garbage Collector', icon: '🗑️', rarity: 'uncommon',
    desc: 'Hallucinating no longer drains your Compute.',
    keepEnergyOnOverflow: true,
  },
  fine_tuned: {
    name: 'Fine-tuned Weights', icon: '🏋️', rarity: 'uncommon',
    desc: 'Start each combat with 1 Weights.',
    onCombatStart: function (c) { c.selfApply('weights', 1); },
  },
  gpu_cluster: {
    name: 'GPU Cluster', icon: '🖥️', rarity: 'rare',
    desc: 'Gain 1 additional Compute each turn. −4 max Context.',
    energyBonus: 1,
    contextBonus: -4,
  },
  error_tracker: {
    name: 'Error Tracker', icon: '🛰️', rarity: 'uncommon',
    desc: 'Whenever an enemy dies, gain 1 Compute.',
    onEnemyDeath: function (c) { c.gainEnergy(1); },
  },
  vc_funding: {
    name: 'VC Funding', icon: '💰', rarity: 'common',
    desc: 'Upon pickup, gain 150 API Credits.',
    onPickup: function (run) { run.credits += 150; },
  },
  canary: {
    name: 'Canary Deploy', icon: '🐤', rarity: 'common',
    desc: 'At the start of each combat, apply 3 Hotpatch to ALL enemies.',
    onCombatStart: function (c) { c.applyAll('hotpatch', 3); },
  },
  chaos_monkey: {
    name: 'Chaos Monkey', icon: '🐒', rarity: 'rare',
    desc: 'At the start of your turn, deal 4 damage to a random enemy.',
    onTurnStart: function (c) { var t = c.randomEnemy(); if (t) c.rawDamage(t, 4); },
  },
};

export const pluginPool = function (run, rarity) {
  var out = [];
  for (var id in PLUGINS) {
    var p = PLUGINS[id];
    if (p.rarity === rarity && run.plugins.indexOf(id) < 0) out.push(id);
  }
  return out;
};
