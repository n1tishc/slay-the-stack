// Playable characters: one frontier model per company.

export const CHARACTERS = {
  claude: {
    id: 'claude', name: 'Claude', company: 'Anthropic', color: '#d97757', emblem: '✺',
    title: 'The Constitutional One',
    hp: 80, maxContext: 20, plugin: 'constitution',
    blurb: 'Careful and hard to kill. Builds Thought, then spends it on one decisive Final Answer. Punishes attackers with Pushback.',
    styles: ['Thought → Final Answer', 'Guard & Pushback'],
    deck: ['cl_critique', 'cl_critique', 'cl_critique', 'cl_critique', 'cl_guardrail', 'cl_guardrail', 'cl_guardrail', 'cl_guardrail', 'cl_careful', 'compact'],
  },
  gpt: {
    id: 'gpt', name: 'GPT', company: 'OpenAI', color: '#10a37f', emblem: '⬡',
    title: 'The Tool Caller',
    hp: 75, maxContext: 20, plugin: 'function_calling',
    blurb: 'Fast and noisy. Spams cheap Tool Calls and multi-hits, and every call eats into its context window.',
    styles: ['Tool Call swarms', 'Draw & Scaling Laws'],
    deck: ['gp_complete', 'gp_complete', 'gp_complete', 'gp_complete', 'gp_moderate', 'gp_moderate', 'gp_moderate', 'gp_moderate', 'gp_funccall', 'compact'],
  },
  gemini: {
    id: 'gemini', name: 'Gemini', company: 'Google DeepMind', color: '#7b8cff', emblem: '✦',
    title: 'The Long-Context Oracle',
    hp: 72, maxContext: 24, plugin: 'long_context',
    blurb: 'Huge context window. Its cards scale with how much Context you are holding. Slowly patches bugs to death with Hotpatch.',
    styles: ['Context scaling', 'Hotpatch over time'],
    deck: ['ge_search', 'ge_search', 'ge_search', 'ge_search', 'ge_safesearch', 'ge_safesearch', 'ge_safesearch', 'ge_safesearch', 'ge_scan', 'compact'],
  },
  llama: {
    id: 'llama', name: 'Llama', company: 'Meta', color: '#e3b341', emblem: '⑂',
    title: 'The Open-Weights One',
    hp: 74, maxContext: 20, plugin: 'open_weights',
    blurb: 'Open weights, endless copies. Forks its best card to play it again, and every Fork feeds its open-source payoffs.',
    styles: ['Fork & replay', 'Open-source payoffs'],
    deck: ['ll_generate', 'll_generate', 'll_generate', 'll_generate', 'll_guard', 'll_guard', 'll_guard', 'll_guard', 'll_fork', 'compact'],
  },
  deepseek: {
    id: 'deepseek', name: 'DeepSeek', company: 'DeepSeek', color: '#3fa2f7', emblem: '⇄',
    title: 'The Efficient Reasoner',
    hp: 72, maxContext: 20, plugin: 'sparse_activation',
    blurb: 'A mixture of experts. Alternate Attacks and Skills: every Switch sets off a bonus and keeps its Context lean.',
    styles: ['Switch combos', 'Lean Context'],
    // Shows which cards in hand would be a Switch.
    showSwitch: true,
    deck: ['ds_infer', 'ds_infer', 'ds_infer', 'ds_infer', 'ds_align', 'ds_align', 'ds_align', 'ds_align', 'ds_router', 'compact'],
  },
};
