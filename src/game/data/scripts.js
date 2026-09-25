// Scripts (potions): one-shot consumables usable during combat.

export const SCRIPTS = {
  hotfix: { name: 'hotfix.sh', icon: '🩹', desc: 'Heal 20 HP.', target: 'self',
    use: function (c) { c.heal(20); } },
  rollback: { name: 'rollback.sh', icon: '⏪', desc: 'Gain 12 Guard.', target: 'self',
    use: function (c) { c.p.block += 12; } },
  forkbomb: { name: 'forkbomb.sh', icon: '💣', desc: 'Deal 12 damage to ALL enemies.', target: 'self',
    use: function (c) { c.enemiesAlive().forEach(function (e) { c.rawDamage(e, 12); }); } },
  cacheflush: { name: 'cache_flush.sh', icon: '🚿', desc: 'Set your Context to 0. Draw 2 cards.', target: 'self',
    use: function (c) { c.setContext(0); c.draw(2); } },
  overclock: { name: 'overclock.sh', icon: '🔥', desc: 'Gain 2 Compute.', target: 'self',
    use: function (c) { c.gainEnergy(2); } },
  stacktrace: { name: 'stacktrace.py', icon: '🧷', desc: 'Apply 3 Exposed to an enemy.', target: 'enemy',
    use: function (c, t) { c.apply(t, 'exposed', 3); } },
  finetune: { name: 'finetune.py', icon: '🏋️', desc: 'Gain 2 Weights for this combat.', target: 'self',
    use: function (c) { c.selfApply('weights', 2); } },
  patch: { name: 'patch.diff', icon: '🩺', desc: 'Apply 8 Hotpatch to an enemy.', target: 'enemy',
    use: function (c, t) { c.apply(t, 'hotpatch', 8); } },
};
