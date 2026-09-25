// Encounter pools for Chapter 1.
// Normal fights follow a learning curve: beginner failure modes one at a time, then agent-workflow
// failures (often next to one you already know), then security failures. The first fight is
// always Context Rot, because every starter deck already holds its counter (/compact).

export const FIRST_ENCOUNTER = ['context_rot'];

export const ENCOUNTERS = {
  // Tier 1: normal fights 1–2.
  easy: [['hallucinated_api', 'hallucinated_api'], ['sycophancy'], ['vague_prompt'], ['context_rot']],
  // Tier 2: normal fights 3–4.
  medium: [
    ['outdated_api', 'outdated_api', 'outdated_api'],
    ['test_tampering'],
    ['placeholder_code'],
    ['scope_creep'],
    ['sycophancy', 'outdated_api'],
    ['vague_prompt', 'outdated_api'],
    ['hallucinated_api', 'placeholder_code'],
  ],
  // Tier 3: normal fight 5 onward.
  hard: [
    ['destructive_cmd'],
    ['prompt_injection', 'outdated_api'],
    ['ghost_package'],
    ['prompt_injection', 'hallucinated_api'],
    ['destructive_cmd', 'outdated_api'],
    ['ghost_package', 'sycophancy'],
    ['prompt_injection', 'vague_prompt'],
  ],
  // Each run's boss is picked at the start (and shown on the map); its Incidents foreshadow it.
  elites: {
    outage: [['n_plus_one'], ['infinite_loop'], ['dependency_hell']],
    ransomware: [['leaked_key'], ['phishing'], ['dependency_hell']],
    rogue_agent: [['paperclip'], ['reward_hacker'], ['infinite_loop']],
  },
};

export const BOSS_IDS = Object.keys(ENCOUNTERS.elites);
