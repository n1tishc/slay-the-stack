// Difficulty modes, chosen at character select. They scale enemy HP and enemy attack damage.
export const MODES = {
  learning: {
    id: 'learning', name: 'Learning', icon: '🌱', hp: 0.85, dmg: 0.85,
    desc: 'Enemies have 15% less HP and hit 15% softer. Room to learn every failure mode.',
  },
  standard: { id: 'standard', name: 'Standard', icon: '⚖️', hp: 1, dmg: 1, desc: 'The game as designed.' },
  hard: {
    id: 'hard', name: 'Hard', icon: '🔥', hp: 1.1, dmg: 1.1,
    desc: 'Enemies have 10% more HP and hit 10% harder.',
  },
};

export const modeOf = function (run) {
  return MODES[run.mode] || MODES.standard;
};
