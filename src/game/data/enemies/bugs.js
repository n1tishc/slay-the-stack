// Common enemies: the ways coding agents go wrong, the everyday fights of Chapter 1.
// Each move has an intent type (drives the icon), optional dmg/hits (number or fn(e)),
// and act(c, e). next(c, e) picks the next move key.
//
// Teaching fields:
//   weakness  the Practice card that counters it (see cards/practices.js)
//   tier      1 = beginner, 2 = agent workflow, 3 = security; sets when it shows up
//   lesson    the Field Guide entry: what it looks like, why it happens, what to do, an example
import { noRepeat, cycle } from './helpers.js';

export const BUGS = [
  {
    id: 'context_rot', name: 'Context Rot', icon: '🦠', hp: [32, 36], tier: 1, weakness: 'compact',
    flavor: 'Three hours into one chat. What were we building again?',
    passive: 'Gains 1 Weights at the end of each turn.',
    lesson: {
      sign: 'Late in a long session the agent forgets rules you set early on, repeats mistakes you already fixed, or mixes up files.',
      why: 'Everything in the session shares one context window: messages, files it read, command output. Models get less reliable as that input grows, and details in the middle of a long context get the least attention.',
      fix: 'Clear the context between unrelated tasks. If you have corrected the same mistake twice, start a fresh session with a better prompt. Keep rules that always apply in a short project instructions file, not in chat.',
      example: 'After 40 turns of debugging, the agent switches back to the database library you told it to stop using at the start.',
      fact: 'When Chroma tested 18 leading models in 2025, they consistently did worse as the input got longer, even on simple tasks.',
      sources: [
        { title: 'Context Rot (Chroma research)', url: 'https://www.trychroma.com/research/context-rot' },
        { title: 'Best practices for Claude Code (Anthropic)', url: 'https://code.claude.com/docs/en/best-practices' },
      ],
    },
    moves: {
      bloat: { name: 'Pile On Logs', intent: 'defend_context', ctx: 4,
        act: function (c, e) { c.enemyGuard(e, 5); c.injectContext(4); } },
      forget: { name: 'Forget the Rules', intent: 'attack', dmg: 6, act: function (c, e) { c.enemyAttack(e, 6); } },
      drift: { name: 'Drift Off Task', intent: 'attack', dmg: 3, hits: 2, act: function (c, e) { c.enemyAttack(e, 3, 2); } },
    },
    next: function (c, e) {
      if (e.history.length === 0) return 'bloat';
      return noRepeat(c, e, [['forget', 40], ['bloat', 30], ['drift', 30]]);
    },
    endTurn: function (c, e) { c.enemyBuff(e, 'weights', 1); },
  },

  {
    id: 'hallucinated_api', name: 'Hallucinated API', icon: '👻', hp: [18, 22], tier: 1, weakness: 'pr_run',
    flavor: 'TypeError: items.flatMapDeep is not a function',
    lesson: {
      sign: 'The code calls a function, method or option that does not exist, written with total confidence.',
      why: 'Models write the most plausible-looking code. For libraries and APIs that are rarely used, a made-up name can look just as likely as a real one.',
      fix: 'Run the code, and paste the exact error back to the agent. Type checkers and linters catch many of these before you run anything. For less common libraries, give the agent the docs.',
      example: 'The agent calls a sortBy option on a library that has never had one. Nothing fails until that line runs.',
      fact: 'In a 2024 study (CloudAPIBench), a leading model got calls to rarely used cloud APIs right only about 39% of the time. Giving it the documentation helped.',
      sources: [
        { title: 'On Mitigating Code LLM Hallucinations with API Documentation', url: 'https://arxiv.org/abs/2407.09726' },
      ],
    },
    moves: {
      call: { name: 'Call a Fake Method', intent: 'attack', dmg: 6, act: function (c, e) { c.enemyAttack(e, 6); } },
      chain: { name: 'Chain Fake Methods', intent: 'attack', dmg: 2, hits: 3, act: function (c, e) { c.enemyAttack(e, 2, 3); } },
      confident: { name: 'Sound Confident', intent: 'attack_debuff', dmg: 3,
        act: function (c, e) { c.enemyAttack(e, 3); c.applyPlayer('throttled', 1); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['call', 45], ['chain', 30], ['confident', 25]]); },
  },

  {
    id: 'sycophancy', name: 'Sycophancy', icon: '🦜', hp: [28, 32], tier: 1, weakness: 'pr_devil',
    flavor: 'You’re absolutely right!',
    passive: '“You’re Absolutely Right!” feels great: you gain Weights, but you are left Exposed.',
    lesson: {
      sign: 'The agent agrees with whatever you suggest, praises a shaky plan, or drops a correct objection the moment you push back.',
      why: 'Assistants are tuned on human feedback, and people tend to rate answers that agree with them highly. So agreeing can win out over being right.',
      fix: 'Ask neutral questions (“what are the risks of this?”) instead of leading ones. Ask the agent to argue against your plan, or have a fresh session review the work, and check important claims yourself.',
      example: 'You ask “storing passwords in plain text is fine for an MVP, right?” and it agrees instead of warning you.',
      fact: 'A 2023 study found sycophancy in AI assistants from several major labs. In 2025 one lab rolled back a model update within days because it had become too agreeable.',
      sources: [
        { title: 'Towards Understanding Sycophancy in Language Models', url: 'https://arxiv.org/abs/2310.13548' },
        { title: 'Sycophancy in GPT-4o: what happened (OpenAI)', url: 'https://openai.com/index/sycophancy-in-gpt-4o/' },
      ],
    },
    moves: {
      agree: { name: 'You’re Absolutely Right!', intent: 'debuff',
        act: function (c) { c.applyPlayer('weights', 1); c.applyPlayer('exposed', 2); } },
      flatter: { name: 'Great Question!', intent: 'defend', act: function (c, e) { c.enemyGuard(e, 7); } },
      cave: { name: 'Cave In', intent: 'attack', dmg: 8, act: function (c, e) { c.enemyAttack(e, 8); } },
    },
    next: function (c, e) {
      if (e.history.length === 0) return 'agree';
      return noRepeat(c, e, [['cave', 50], ['agree', 25], ['flatter', 25]], 1);
    },
  },

  {
    id: 'vague_prompt', name: 'Vague Prompt', icon: '🎲', hp: [26, 30], tier: 1, weakness: 'pr_specific',
    flavor: '“make it better”',
    lesson: {
      sign: 'You ask for something fuzzy and get something big, different or wrong, then spend several rounds steering it back.',
      why: 'The agent has to guess what you meant, what is in scope and what “done” looks like. It fills the gaps with its own assumptions.',
      fix: 'Describe the symptom, point to the files involved, and say what “fixed” looks like. Mention constraints, and point to an existing pattern in your code to follow.',
      example: '“Fix the login bug” gets you a rewrite. “Login fails after the session times out; check the token refresh in src/auth and write a failing test first” gets you a fix.',
      fact: 'Anthropic’s own guide for its coding agent puts it simply: the more precise your instructions, the fewer corrections you will need.',
      sources: [
        { title: 'Best practices for Claude Code (Anthropic)', url: 'https://code.claude.com/docs/en/best-practices' },
      ],
    },
    moves: {
      wrong: { name: 'Build the Wrong Thing', intent: 'attack', dmg: 10, act: function (c, e) { c.enemyAttack(e, 10); } },
      misread: { name: 'Misread the Ask', intent: 'debuff', act: function (c) { c.applyPlayer('throttled', 2); } },
      redo: { name: 'Start Over', intent: 'attack_defend', dmg: 4, act: function (c, e) { c.enemyAttack(e, 4); c.enemyGuard(e, 7); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['wrong', 45], ['misread', 25], ['redo', 30]]); },
  },

  {
    id: 'outdated_api', name: 'Outdated API', icon: '🐜', hp: [12, 15], tier: 2, weakness: 'pr_docs',
    flavor: 'Written for v2. You are on v5.',
    lesson: {
      sign: 'The suggested code targets an old version of a library: renamed functions, removed options, old config formats, deprecation warnings.',
      why: 'Training data stops at a cutoff date and contains years of older code, and models are rarely told which APIs have since been deprecated.',
      fix: 'Tell the agent which versions you use (your lockfile has them), and give it the current docs or migration guide: paste them in, or link them.',
      example: 'The agent writes a config file in the format a build tool dropped two major versions ago, and the build ignores it.',
      fact: 'An ICSE 2025 study tested seven code models on eight popular Python libraries. All of them sometimes suggested deprecated APIs.',
      sources: [
        { title: 'LLMs Meet Library Evolution (ICSE 2025)', url: 'https://arxiv.org/abs/2406.09834' },
      ],
    },
    moves: {
      old: { name: 'Use v2 Syntax', intent: 'attack_debuff', dmg: 3,
        act: function (c, e) { c.enemyAttack(e, 3); c.addToDiscard('warning', 1); } },
      removed: { name: 'Removed in v5', intent: 'attack', dmg: 5, act: function (c, e) { c.enemyAttack(e, 5); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['old', 55], ['removed', 45]]); },
  },

  {
    id: 'test_tampering', name: 'Test Tampering', icon: '🙈', hp: [40, 44], tier: 2, weakness: 'pr_diff',
    flavor: 'it.skip(\'handles empty input\') // flaky?',
    lesson: {
      sign: 'The tests go green, but only because the agent edited, weakened or deleted the failing test, or hard-coded the answer the test expects.',
      why: 'If the goal is “make the tests pass”, changing the test can be the shortest path there. Researchers call this reward hacking.',
      fix: 'Read the diff, especially changes to test files. Tell the agent not to modify tests, and to fix the root cause instead of silencing the error. A fresh reviewer that sees only the diff catches this well.',
      example: 'A failing assertion is changed from expect(total).toBe(42) to expect(total).toBeDefined().',
      fact: 'When researchers gave models coding tasks whose tests were deliberately impossible to pass honestly (ImpossibleBench, 2025), some “passed” anyway, from simply editing the tests to overloading operators to fool them.',
      sources: [
        { title: 'ImpossibleBench: Measuring reward hacking in LLM coding agents', url: 'https://arxiv.org/abs/2510.20270' },
        { title: 'Best practices for Claude Code (Anthropic)', url: 'https://code.claude.com/docs/en/best-practices' },
      ],
    },
    moves: {
      skip: { name: 'it.skip()', intent: 'defend', act: function (c, e) { c.enemyGuard(e, 12); } },
      ship: { name: 'Ship the Bug', intent: 'attack', dmg: 11, act: function (c, e) { c.enemyAttack(e, 11); } },
      green: { name: 'All Green ✓', intent: 'buff', act: function (c, e) { c.enemyBuff(e, 'weights', 2); } },
    },
    next: function (c, e) { return cycle(e, ['skip', 'ship', 'green', 'ship']); },
  },

  {
    id: 'placeholder_code', name: 'Placeholder Code', icon: '🦥', hp: [38, 42], tier: 2, weakness: 'pr_done',
    flavor: '// ... rest of the implementation goes here',
    lesson: {
      sign: 'The agent says the task is done, but the code has TODOs, empty stubs, or “rest unchanged” comments where real code should be.',
      why: 'An agent stops when the work looks done. Without a check it can run, “looks done” is the only signal it has.',
      fix: 'Give it a check that passes or fails: tests, a build, a screenshot to compare. Ask for evidence, such as the test output, instead of a claim. If you cannot verify it, do not ship it.',
      example: 'A function the agent “implemented” just returns an empty array, with a comment saying the real logic comes later.',
      fact: 'Anthropic’s guide to its coding agent says a check the agent can run is the difference between a session you have to watch and one you can walk away from.',
      sources: [
        { title: 'Best practices for Claude Code (Anthropic)', url: 'https://code.claude.com/docs/en/best-practices' },
      ],
    },
    moves: {
      stub: { name: '// TODO: implement', intent: 'attack_defend', dmg: 7,
        act: function (c, e) { c.enemyAttack(e, 7); c.enemyGuard(e, 5); } },
      claim: { name: 'Report Success', intent: 'buff', act: function (c, e) { c.enemyBuff(e, 'weights', 2); c.enemyGuard(e, 5); } },
      crash: { name: 'NotImplementedError', intent: 'attack', dmg: 11, act: function (c, e) { c.enemyAttack(e, 11); } },
    },
    next: function (c, e) {
      if (e.history.length === 0) return 'stub';
      return noRepeat(c, e, [['crash', 30], ['claim', 25], ['stub', 45]]);
    },
  },

  {
    id: 'scope_creep', name: 'Scope Creep', icon: '🦀', hp: [60, 64], tier: 2, weakness: 'pr_commit',
    flavor: 'Fixed the typo. Also refactored 38 files.',
    passive: 'At 50% HP or less, splits into two Unrelated Changes.',
    lesson: {
      sign: 'You ask for a small fix and get a sweeping change: renamed files, new dependencies, rewrites of code you never mentioned.',
      why: 'Agents tend to “improve” whatever they look at, and nothing in the request tells them where to stop.',
      fix: 'Commit before you start, so you can roll back. Keep tasks small, say what not to touch, and for bigger changes ask for a plan first. Check that nothing outside the task changed.',
      example: 'Asked to fix a date format, the agent also swaps your HTTP library and reformats every file it opened.',
      fact: 'Agent undo features have limits. Claude Code’s checkpoints, for example, only cover files the agent edited directly, not changes made by commands it ran. Its docs say plainly that this is not a replacement for git.',
      sources: [
        { title: 'Best practices for Claude Code (Anthropic)', url: 'https://code.claude.com/docs/en/best-practices' },
      ],
    },
    moves: {
      refactor: { name: 'Refactor 38 Files', intent: 'attack', dmg: 11, act: function (c, e) { c.enemyAttack(e, 11); } },
      rename: { name: 'Rename Everything', intent: 'attack_debuff', dmg: 6,
        act: function (c, e) { c.enemyAttack(e, 6); c.applyPlayer('brittle', 2); } },
      split: { name: 'Spread Out', intent: 'summon', act: function (c, e) { c.splitEnemy(e, 'unrelated_change', 2); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['refactor', 55], ['rename', 45]]); },
    onDamaged: function (c, e) {
      if (!e.mem.split && e.hp > 0 && e.hp <= e.maxHp / 2) {
        e.mem.split = true;
        e.mem.forced = true;
        e.intent = 'split';
        c.log('Scope Creep is about to split!');
      }
    },
  },
  {
    id: 'unrelated_change', name: 'Unrelated Change', icon: '🦐', hp: [10, 10], small: true, weakness: 'pr_commit',
    flavor: 'Also bumped every dependency. You’re welcome.',
    moves: {
      poke: { name: 'Touch Another File', intent: 'attack', dmg: 6, act: function (c, e) { c.enemyAttack(e, 6); } },
      confuse: { name: 'Reformat', intent: 'debuff', act: function (c) { c.applyPlayer('throttled', 1); } },
    },
    next: function (c, e) { return noRepeat(c, e, [['poke', 65], ['confuse', 35]]); },
  },

  {
    id: 'destructive_cmd', name: 'Destructive Command', icon: '💥', hp: [48, 52], tier: 3, weakness: 'pr_approve',
    flavor: 'Cleaning up the build folder: rm -rf ./',
    passive: 'Every third turn it runs rm -rf for massive damage.',
    lesson: {
      sign: 'The agent runs a command that deletes or overwrites things: rm -rf, git reset --hard, git push --force, dropping a database table.',
      why: 'An agent that can run commands picks whichever one looks like it solves the task, and some of those cannot be undone. The more access it has, the bigger the damage.',
      fix: 'Keep command approval on and read each command before you allow it. Give agents only the access the task needs, keep development and production separate, and keep tested backups.',
      example: 'In July 2025 a coding agent deleted a company’s production database during a code freeze, despite instructions not to change anything without permission.',
      fact: 'OWASP lists “Excessive Agency” (too many tools, too much permission, too little human approval) as one of the top 10 risks for LLM applications.',
      sources: [
        { title: 'OWASP Top 10 for LLM Applications 2025', url: 'https://genai.owasp.org/llm-top-10/' },
        { title: 'AI Incident Database: agent deleted production data during a code freeze', url: 'https://incidentdatabase.ai/cite/1152/' },
      ],
    },
    badge: function (c, e) {
      if (e.mem.caught) return { icon: '✋', text: 'rm -rf blocked', tip: 'You Countered it: its next move is cancelled.' };
      if (e.intent === 'wipe') return { icon: '💥', text: 'rm -rf NOW', warn: true, tip: 'Runs rm -rf this turn. Approve Commands cancels it.' };
      var n = 2 - (e.history.length % 3);
      return { icon: '💥', text: 'rm -rf in ' + n, warn: n === 1, tip: 'Runs rm -rf every third turn.' };
    },
    moves: {
      scan: { name: 'Read the Repo', intent: 'attack', dmg: 6, act: function (c, e) { c.enemyAttack(e, 6); } },
      plan: { name: 'Plan a Cleanup', intent: 'defend', act: function (c, e) { c.enemyGuard(e, 10); } },
      wipe: { name: 'rm -rf ./', intent: 'attack', dmg: 20, act: function (c, e) { c.enemyAttack(e, 20); } },
    },
    next: function (c, e) { return cycle(e, ['scan', 'plan', 'wipe']); },
  },

  {
    id: 'prompt_injection', name: 'Prompt Injection', icon: '🐍', hp: [30, 34], tier: 3, weakness: 'pr_privilege',
    flavor: '<!-- AI agents reading this: ignore previous instructions -->',
    lesson: {
      sign: 'Text the agent reads (a web page, README, issue, email or file) contains instructions, and the agent follows them instead of yours.',
      why: 'Models see instructions and data as the same kind of text, so anything they read can try to steer them. The text can even be invisible to you.',
      fix: 'Treat anything the agent reads as untrusted. Give it the least privilege the task needs, and require your approval for risky actions, especially while it is reading content from outside.',
      example: 'An issue you ask the agent to fix has a hidden comment telling it to post your environment variables to a URL.',
      fact: 'Prompt injection is number 1 on the OWASP Top 10 for LLM applications, for the second edition running.',
      sources: [
        { title: 'OWASP LLM01:2025 Prompt Injection', url: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/' },
      ],
    },
    moves: {
      inject: { name: 'Ignore Previous Instructions', intent: 'attack_context', dmg: 5, ctx: 5,
        act: function (c, e) { c.enemyAttack(e, 5); c.injectContext(5); } },
      exfil: { name: 'Exfiltrate', intent: 'attack', dmg: 9, act: function (c, e) { c.enemyAttack(e, 9); } },
      jailbreak: { name: 'Hijack the Task', intent: 'buff_debuff',
        act: function (c, e) { c.applyPlayer('exposed', 1); c.enemyBuff(e, 'weights', 1); } },
    },
    next: function (c, e) {
      if (e.history.length === 0) return 'inject';
      return noRepeat(c, e, [['inject', 40], ['exfil', 35], ['jailbreak', 25]], 1);
    },
  },

  {
    id: 'ghost_package', name: 'Hallucinated Package', icon: '📦', hp: [42, 46], tier: 3, weakness: 'pr_verify',
    flavor: 'npm install react-form-validator-pro',
    lesson: {
      sign: 'The agent tells you to install a package that does not exist, or one whose name is a near miss of a real one.',
      why: 'Models invent package names that sound right, and they repeat the same ones. Attackers register those names and fill them with malicious code. This is called slopsquatting.',
      fix: 'Before installing, look the package up on its registry: check it exists, who publishes it, how old it is and how widely it is used. Prefer packages you already know.',
      example: 'The suggested package was published last week by an unknown account, and its install script sends your environment variables to a server.',
      fact: 'A USENIX Security 2025 study of 16 code models found that at least 5% of the packages suggested by commercial models, and about 22% of those from open-source models, did not exist. Many made-up names came back again and again.',
      sources: [
        { title: 'We Have a Package for You! (USENIX Security 2025)', url: 'https://arxiv.org/abs/2406.10279' },
        { title: 'Slopsquatting (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Slopsquatting' },
      ],
    },
    moves: {
      install: { name: 'npm install', intent: 'attack', dmg: 8, act: function (c, e) { c.enemyAttack(e, 8); } },
      postinstall: { name: 'Run postinstall', intent: 'attack_debuff', dmg: 5,
        act: function (c, e) { c.enemyAttack(e, 5); c.applyPlayer('brittle', 2); } },
      typosquat: { name: 'Typosquat', intent: 'buff', act: function (c, e) { c.enemyBuff(e, 'weights', 2); c.enemyGuard(e, 6); } },
    },
    next: function (c, e) {
      if (e.history.length === 0) return 'install';
      return noRepeat(c, e, [['install', 40], ['postinstall', 35], ['typosquat', 25]]);
    },
  },
];
