# Slay the Stack

**A roguelike deckbuilder that teaches you how AI coding agents go wrong.**

Slay the Stack is a Slay the Spire–inspired card game that runs in the browser. You play as a frontier AI model on call for a production outage. The monsters are the real failure modes of coding agents: made-up APIs, tests quietly weakened until they pass, `rm -rf` on the wrong folder, instructions hidden in an issue. The cards that beat them are the habits that prevent those failures in real life.

It is aimed at developers who are starting to work with coding agents. Every fight, reward screen and Slack thread teaches a real lesson. The lessons are checked against published research, and each one links to its sources.

The game uses a handheld dual-screen layout:

- **Top screen:** a low-res three.js world of pixel-art billboard sprites (2.5D), with battle-intro wipes and a typewriter message box. It is drawn through an optional low-colour dither filter.
- **Bottom screen:** the touch-style menu, which holds your hand, the Context meter and the route map.

## Contents

- [Features at a glance](#features-at-a-glance)
- [Getting started](#getting-started)
- [How to play](#how-to-play)
- [Learning as you play](#learning-as-you-play)
- [Characters](#characters)
- [Difficulty](#difficulty)
- [Chapter 1: The Legacy Monolith](#chapter-1-the-legacy-monolith)
- [Settings and accessibility](#settings-and-accessibility)
- [Saving and data](#saving-and-data)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [Extending the game](#extending-the-game)
- [Testing and quality](#testing-and-quality)
- [Balance](#balance)
- [Slay the Spire → Slay the Stack](#slay-the-spire--slay-the-stack)
- [Credits and disclaimer](#credits-and-disclaimer)

## Features at a glance

**Characters and combat**

- **5 playable models:** Claude, GPT, Gemini, Llama and DeepSeek. Each has its own mechanic, starting plugin and about 20 cards.
- **A deckbuilder with a twist:** every card costs tokens, which fill your **Context window**. Fill it past 70% and your attacks hit harder. Overflow it and you hallucinate.

**Learning**

- **11 failure modes as enemies**, each countered by a real-world **Practice** card (Run It, Review the Diff, Approve Commands, …).
- **A Field Guide** of lessons: what each failure looks like, why it happens, what to do, an example and a sourced fact.
- **12 "what would you do?" Slack scenarios**, graded best, risky or bad. Missed ones come back in later runs, and a **Practice mode** lets you drill them without playing a run.
- **An end-of-run recap** of the failure modes you met and the calls worth revisiting.

**Structure and replay**

- **3 SEV-0 bosses**, each with its own crew of elite Incidents, a branching 12-floor map, shops, rest sites and treasure.
- **3 difficulty modes:** Learning, Standard and Hard. Hard unlocks after your first Standard win.

**Presentation and access**

- **Runs anywhere:** mouse, keyboard or touch (press and hold anything to read it). There is a phone layout, a large-text setting and a reduced-motion setting.
- **No image files:** all art is generated at runtime on canvases.

## Getting started

You need Node 20.19+ or 22.12+ (Vite 8's minimum).

```sh
npm install
npm run dev        # http://localhost:5173
```

| Script               | What it does                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| `npm run dev`        | Vite dev server with hot reload                                             |
| `npm run build`      | Production build into `dist/` (relative paths, so you can host it anywhere) |
| `npm run preview`    | Serve the production build locally                                          |
| `npm test`           | Unit tests (Vitest): engine mechanics and full-run bot simulations          |
| `npm run test:watch` | Unit tests in watch mode                                                    |
| `npm run test:e2e`   | Browser tests (Playwright); starts the dev server itself                    |
| `npm run sim -- 200` | Balance report: 200 bot runs per character, win rates, causes of death      |
| `npm run lint`       | ESLint                                                                      |
| `npm run format`     | Prettier (`format:check` only checks)                                       |

Before your first `npm run test:e2e`, install the browser once with `npx playwright install chromium`.

The game is built from ES modules, so it has to be served over HTTP. Opening `index.html` straight from disk won't work. Use `npm run dev`, or build it and host `dist/` on any static server.

For debugging, the browser console exposes `SS`: the game data and engine, the UI state (`SS.UI`), the 3D stage, settings, and helpers such as `SS.debug.startCombat('elite')`.

## How to play

### A run

1. **Pick a model and a difficulty** on the character-select screen.
2. **Climb the map.** It has 12 floors plus the boss. The boss for this run is shown from the start. Each stop is one of these:

   | Stop            | What happens                                                                  |
   | --------------- | ----------------------------------------------------------------------------- |
   | 🐛 Bug          | A normal fight against one or more failure modes                              |
   | 🔥 Incident     | An elite (SEV-2) fight from the boss's crew; it drops a Plugin                |
   | 💬 Slack Thread | A "what would you do?" scenario, graded best, risky or bad                    |
   | ☕ Downtime     | Sleep (heal) or Fine-tune (upgrade a card)                                    |
   | 🛒 Marketplace  | Buy cards, Plugins and Scripts with API Credits, or Deprecate (remove) a card |
   | 🎁 Stash        | An unclaimed Plugin                                                           |

3. **Beat the SEV-0 boss** to resolve the incident. If you lose, the game-over screen recaps what the run taught you.

### Combat basics

- You get **3 Compute** each turn and draw 5 cards. Cards cost Compute to play.
- **Attacks** deal damage. **Skills** mostly give **Guard**, which blocks damage until your next turn. **Powers** last for the whole fight.
- Every enemy shows its **intent**, meaning what it will do next turn, so you can plan around it.

### The twist: the Context window

Every card has a token cost (the blue `+Nt` badge) on top of its Compute cost. Playing a card adds its tokens to your **Context**, and Context carries over from turn to turn within a fight.

- Tokens are added _before_ the card resolves.
- **Deep Context:** at 70% of max Context or higher, your attacks deal **+50% damage**.
- **Overflow:** if Context is above max after a card resolves, you **Hallucinate**. Context resets to 0, you lose all remaining Compute, and a Hallucination card is shuffled into your draw pile.
- Hovering a card previews the meter. A red token badge means the card would Overflow you.
- Some failure modes (📥) **inject tokens** into your Context. `/compact`, which is in every starter deck, halves it.

### Controls

| Input    | How                                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mouse    | Click a card to play it. If it needs a target, click the enemy's sprite or nameplate next. Hover over anything to see a tooltip. Right-click cancels targeting. |
| Keyboard | `1`–`0` play or select cards, `E` ends your turn, `Esc` cancels targeting or closes a window.                                                                   |
| Touch    | Tap to play. **Press and hold** a card, keyword, intent or plugin to read its tooltip; the hold never plays the card.                                           |
| Map      | Click a glowing stop on either screen. Scroll or drag the top screen to look ahead.                                                                             |

## Learning as you play

- **Failure modes.** Every common enemy is a real way coding agents go wrong. The fights follow a learning curve:
  - Your first two normal fights are beginner mistakes.
  - The next two are agent-workflow problems.
  - From the fifth on, you meet security failures, often alongside one you already know.
- **Practices.** Each failure mode is weak to one Practice card: the habit that prevents it. Hovering an enemy shows its weakness. Playing that card **Counters** the enemy: its next move is cancelled and it becomes Exposed. A Practice in your hand that can Counter something on screen is tagged COUNTER.
- **The first fight** is always Context Rot. Every starter deck already holds its counter, `/compact`, so you see a Counter work before anything else.
- **Postmortem.** After each fight, the reward screen shows the real-world fix for every failure mode you just met, and offers any Practice you don't have yet.
- **Field Guide.** The title screen keeps an entry for every failure mode you have met. Each entry has:
  - what it looks like, and why it happens
  - what to do, with an example
  - a "Did you know?" fact from published research, with links to the sources

  Failure modes you haven't met stay hidden.

- **"What would you do?" scenarios.** The Slack-thread rooms are realistic situations: the agent wants to `git push --force`, the tests went green because an assertion was weakened, an issue contains hidden instructions. You pick one of three answers, shown in a shuffled order with no outcomes. Then the game reveals whether it was the best call, a risky one or a bad one, why, and what the best call was.
  - **Best call:** 40 Credits, plus 15 more for each best call in a row, and the matching Practice card (or a card upgrade if you already have it).
  - **Risky call:** 20 Credits.
  - **Bad call:** lose 8 HP (never fatal), and the worst ones also add Tech Debt.
- **Spaced retrieval.** A scenario you got wrong comes back, tagged RETRY, in a later run. While you have misses left, every other Slack thread is a retry. Otherwise, scenarios you've never seen come first.
- **Practice mode.** The PRACTICE tile on the title screen deals the scenarios on their own, with no run, rewards or HP at stake. The ones you missed come first, then the ones you've never tried. A best call here also takes a scenario off your list to revisit.
- **End-of-run recap.** The game-over screen lists the failure modes you met (each one opens its Field Guide entry) and the calls to revisit, with their best answers.

| Tier           | Failure mode         | Practice that Counters it |
| -------------- | -------------------- | ------------------------- |
| Beginner       | Context Rot          | /compact                  |
| Beginner       | Hallucinated API     | Run It                    |
| Beginner       | Sycophancy           | Devil’s Advocate          |
| Beginner       | Vague Prompt         | Be Specific               |
| Agent workflow | Outdated API         | Read the Docs             |
| Agent workflow | Test Tampering       | Review the Diff           |
| Agent workflow | Placeholder Code     | Define Done               |
| Agent workflow | Scope Creep          | Commit First              |
| Security       | Destructive Command  | Approve Commands          |
| Security       | Prompt Injection     | Least Privilege           |
| Security       | Hallucinated Package | Verify the Package        |

The lesson text lives next to each enemy in `src/game/data/enemies/bugs.js` (`lesson: { sign, why, fix, example, fact, sources }`). The scenarios are in `src/game/data/events.js`.

The advice is checked against these published sources:

- the OWASP Top 10 for LLM Applications (2025)
- Anthropic's best practices for Claude Code
- peer-reviewed studies (ICLR, ICSE and USENIX Security) on sycophancy, deprecated API usage and package hallucinations
- research reports and preprints on context rot, API hallucinations and reward hacking

Facts are worded to match what the sources state. If you change one, check it against its source.

## Characters

| Model                        | HP  | Context | Starting Plugin                                          | Playstyle                                                          |
| ---------------------------- | --- | ------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| **Claude** (Anthropic)       | 80  | 20      | Constitution: heal 6 after each fight                    | Build Thought and cash it in with Final Answer; Guard and Pushback |
| **GPT** (OpenAI)             | 75  | 20      | Function Calling: start each fight with 3 Tool Calls     | Tool Call swarms; draw and Scaling Laws                            |
| **Gemini** (Google DeepMind) | 72  | 24      | Long Context: Deep Context kicks in at 60%               | Cards that scale with Context; Hotpatch damage over time           |
| **Llama** (Meta)             | 74  | 20      | Open Weights: a random card starts each fight Fine-tuned | Fork (copy) the last card you played; payoffs for playing Forks    |
| **DeepSeek** (DeepSeek)      | 72  | 20      | Sparse Activation: every Switch reduces Context by 1     | Alternate Attacks and Skills; each Switch triggers a bonus         |

Each model's signature mechanic:

- **Claude: Thought.** Cards stack Thought, and Final Answer spends all of it for one big hit. Pushback and Principles damage whoever attacks you.
- **GPT: Tool Calls.** These are 0-Compute, 1-token attacks that Exhaust after use. GPT floods its hand with them. Every call eats into its context window.
- **Gemini: Context scaling.** Its cards get stronger the more Context you hold. Hotpatch deals damage over time, like poison.
- **Llama: Fork.** A Fork is a copy of the last Attack, Skill or Power you played this turn. It costs 1 less Compute, is Ethereal (it disappears if you don't play it that turn), and is Exhausted when played. Forks show a gold FORK badge. Payoff cards count the Forks you've played or are holding.
- **DeepSeek: Switch.** A card is a Switch when it's an Attack played right after a Skill, or a Skill right after an Attack, in the same turn. Many DeepSeek cards have a "Switch:" bonus, and cards that would Switch show a blue SWITCH badge in your hand.

## Difficulty

Pick the difficulty on the character-select screen. It scales enemy HP and enemy attack damage.

| Mode     | Enemies                      | Unlock                                    |
| -------- | ---------------------------- | ----------------------------------------- |
| Learning | 15% less HP, 15% less damage | Always; the default for new players       |
| Standard | as designed                  | Always; the default for returning players |
| Hard     | 10% more HP, 10% more damage | After a win on Standard                   |

The run's mode is shown on the game-over screen and in Run History.

## Chapter 1: The Legacy Monolith

The map is 12 floors plus the boss, with branching paths like Slay the Spire. Each run picks one of **three SEV-0 bosses**, shown on the map from the start. The Incidents (elites) you meet on the way belong to that boss's crew, so they foreshadow the final fight.

| Boss (SEV-0)                | How it fights                                                                                                                                                                                             | Its Incidents                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 🐉 **The Cascading Outage** | PagerDuty Alert spam and Context Poisoning. At 50% HP it enters Total Outage, with a deadlier pattern.                                                                                                    | The N+1 Query, Infinite Loop, Dependency Hell      |
| 🔐 **Ransomware**           | **Encrypts** your cards: they cost 1 more until played. A visible countdown leads to **Deadline**, which hits harder for every Encrypted card. At 50% HP it locks down and encrypts your whole next hand. | Leaked API Key, Phishing Campaign, Dependency Hell |
| 👾 **The Rogue Agent**      | Plays by _your_ rules. It has its own Context window, goes Deep (+50% damage) and **Overflows into a Hallucinating turn** where it does nothing. Replay Attack scales with how many cards you played.     | Paperclip Maximizer, Reward Hacker, Infinite Loop  |

Some of the Incidents:

- **Leaked API Key:** steals 15 Credits per Scrape and escapes on its 5th turn, taking the Credits and its Plugin with it. Fix it first to get everything back.
- **Phishing Campaign:** slips Phishing Links into your hand. Each one gives you 1 free Compute, but makes every enemy stronger.
- **Paperclip Maximizer:** manufactures Paperclips, and gains Weights for every one still alive.
- **Reward Hacker:** optimises a proxy metric that flips each turn between Attacks and Skills, and gains Guard whenever you play that type.

**Common enemies** are the eleven failure modes above:

- Scope Creep splits into Unrelated Changes at half HP.
- Destructive Command runs `rm -rf` for 20 damage every third turn, unless you Counter it.

## Settings and accessibility

Settings are on the title screen, and behind the ⚙ button during a run:

| Setting           | Options          | Notes                                                                                                                                               |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text size         | Normal / Large   | Large scales messages, scenarios, lessons and tooltips by 1.2×. Card rules, the HUD and the map keep their size, because they must fit fixed boxes. |
| Game speed        | 1× / 1.6× / 2.5× | Speeds up animations and enemy turns                                                                                                                |
| Screen shake      | On / Off         |                                                                                                                                                     |
| Reduced motion    | On / Off         | No shake, flashes, glitch or camera sway. It defaults to your OS "reduce motion" preference.                                                        |
| Top-screen pixels | Chunky / Crisp   |                                                                                                                                                     |
| Handheld colour   | On / Off         | Low colour depth with dithering on the top screen                                                                                                   |

Other accessibility choices:

- Reading text uses Atkinson Hyperlegible. The pixel font is only for short labels.
- Every rules keyword is underlined and explained on hover, or on press-and-hold on touch screens.
- Below 820px wide, the layout switches to a single scrolling column for phones.

## Saving and data

Everything is stored in your browser's localStorage. Nothing is sent anywhere.

| Key                          | What it holds                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `slay-the-stack-save-v1`     | The run in progress. It is saved every time you return to the map; CONTINUE on the title screen resumes it. |
| `slay-the-stack-settings-v1` | Settings, the difficulty last picked, and whether Hard is unlocked                                          |
| `slay-the-stack-history-v1`  | The last 30 runs (model, mode, result, floor, what took you down, seed)                                     |
| `slay-the-stack-guide-v1`    | The Field Guide entries you have unlocked                                                                   |
| `slay-the-stack-calls-v1`    | Your last answer to each scenario, which drives retries and Practice                                        |

To reset everything, clear the site's data in your browser.

## Architecture

The code is plain JavaScript (ES modules) in three layers, which only talk in one direction:

```
src/game   pure rules and data: no DOM, no three.js; runs in the browser, Vitest and Node
   ↑
src/ui     the bottom screen and HTML overlays: renders state, turns clicks into engine calls
src/stage  the top screen (three.js): scenes, sprites, camera, effects
   ↑
src/art    runtime pixel art: robots, emoji icons, textures, drawn on canvases
```

- **Content is data.** Cards, enemies, plugins, scripts and scenarios are plain objects in `src/game/data`. A card looks like this:

  ```js
  {
    id: 'll_fork', name: 'Fork', char: 'llama', type: 'skill', rarity: 'basic', icon: '🌿',
    cost: 0, tok: 2, v: { n: 1 }, upg: { tok: 1, v: { n: 2 } },   // base numbers, then Fine-tuned overrides
    desc: function (v, fx) { return 'Fork the last card you played.'; }, // fx formats live numbers
    play: function (c, v, t) { c.forkLast(v.n); },                     // c = Combat, t = target
  }
  ```

- **Fast first load.** The UI imports only `src/stage/index.js`, which has no three.js in it. three.js and the scenes (about two thirds of the code) come in a separate chunk that starts downloading at boot, so the menus work straight away and the top screen appears when the chunk lands. Until then the latest scene request is remembered, effects are skipped, and a fight waits for the chunk. If the download fails, the game offers a reload. The run is saved before every fight.
- **The combat engine** (`src/game/engine/combat.js`) holds all the rules: Context and Overflow, damage math, statuses, Counters, Forks and Switches, the turn flow. It records what happened in an effects list (`c.fx`), and the UI plays that back as animations.
- **The run** (`src/game/engine/run.js`) is a plain JSON-friendly object: deck, HP, map, plugins, stats. It uses a seeded RNG, so a seed replays the same run.
- **The UI** rebuilds the bottom screen from state on every `render()`. Each screen module exports `bottom()`, plus `hud()` and `world()` if it has top-screen overlays. Buttons declare `data-act="name"`, and one delegated listener dispatches to the handlers each screen registers with `defineActions()`.
- **The top screen** renders at about 190px tall and is upscaled with `image-rendering: pixelated`. To keep pixel art from shimmering at that size:
  - the battle camera is locked
  - sprites animate in whole-texel steps
  - HTML labels snap to the same pixel grid

## Project layout

```
index.html                 page shell (two screens + overlays)
src/main.js                entry point: styles, app start, `SS` debug handle
src/settings.js            persisted settings, run history, Field Guide and scenario progress

src/game/                  pure game logic (see Architecture)
  core/                    seeded RNG, ids, keyword glossary
  data/cards/              one file per character (GPT's is gpt-cards.js: ad blockers block "gpt.js"),
                           shared.js (statuses, curses, Tool Call), practices.js (the Practice cards)
  data/enemies/            failure modes and their lessons (bugs.js), elites, bosses, move helpers
  data/encounters.js       the learning-curve pools for normal fights; each boss's Incident pool
  data/characters.js       the five models: stats, starting deck, plugin, blurb
  data/modes.js            difficulty modes
  data/events.js           the Slack scenarios
  data/plugins.js          plugins (relics); scripts.js: scripts (potions)
  engine/                  combat rules, map generation, run state, rewards and saves

src/art/                   pixel-art pipeline: canvas → hard pixels + outline; robots, textures, emoji icons
src/stage/                 top screen (three.js)
  index.js                 the UI's entry point; loads the three.js side lazily and queues calls until it lands
  impl.js                  the lazily loaded side: stage.js and the scenes
  stage.js                 renderer, main loop, tweens, screen shake, hit-stop, overlay anchoring, picking
  kit.js                   building blocks: billboard sprites (with hit-flash shader), platforms, props, particles
  transition.js            battle-intro wipes
  retro.js                 low-colour + ordered-dither filter
  scenes/                  title, character select, map, battle, rooms

src/ui/                    bottom screen + top-screen HTML overlays
  app.js, flow.js          boot and screen flow (title → select → map → rooms → game over)
  render.js, actions.js    render loop and the data-act action registry
  input.js, tooltip.js     clicks, keyboard shortcuts, hover and press-and-hold tooltips
  components/              card, HP bar, intents, statuses, keywords, status strip, …
  screens/                 title, character select, map, rewards, rest, shop, event, practice, stash, game over
  combat/                  combat view, controller (turn flow) and effects
  modals/                  how to play, Field Guide, settings, history, run menu
src/styles/                CSS split by area; tokens.css holds the palette and sizes, readable.css the reading font

scripts/sim.js             balance simulator (CLI)
tests/unit/                Vitest: mechanics, learning features, simulated runs
tests/e2e/                 Playwright: real browser flows
tests/support/bot.js       the bots shared by the simulator and the tests
```

## Extending the game

**Add a card.**

1. Add an object to the character's file in `src/game/data/cards/`. Give it a unique `id`, `char`, `type`, `rarity` (`common`, `uncommon` or `rare` for rewards), `cost`, `tok`, `v`/`upg`, `desc` and `play`.
2. It joins that character's reward and shop pools automatically.
3. If it uses a new status, add the status's icon and tooltip to `src/ui/components/status.js`.
4. If it introduces a new keyword, add it to `src/game/core/glossary.js`.

**Add a character.**

1. Add an entry to `src/game/data/characters.js`: stats, colour, `plugin`, and a 10-card `deck` whose 9th card is the signature card shown at character select.
2. Add a card file and register it in `src/game/data/cards/index.js`.
3. Add its starting plugin (`rarity: 'starter'`) to `plugins.js`.
4. Add its emblem and head shape to `src/art/robots.js`.
5. The select screen, title scene, simulator and tests pick it up automatically.
6. Run `npm run sim` and tune it until its win rate sits with the others.

**Add a failure mode.**

1. Add it to `src/game/data/enemies/bugs.js`. Include a `tier`, a `weakness` (a Practice card id) and a `lesson` with sources.
2. Add its Practice card to `practices.js`.
3. Put it in a pool in `encounters.js`.
4. Its Field Guide entry is generated from the lesson.

**Add a scenario.**

1. Add an entry to `src/game/data/events.js` with exactly one `best`, one `ok` and one `bad` option, each with a `why`.
2. Link a `failure`, if there is one. A best call then earns that failure mode's Practice card.
3. Retries, Practice mode and the recap handle new scenarios automatically.

## Testing and quality

- **Unit tests** (`npm test`, 38 tests): combat rules (Context, Counters, encryption, Forks, Switches, difficulty scaling), learning features (scenario grading, retries, the recap), and full bot-played runs for every character that check engine invariants after every action.
- **Browser tests** (`npm run test:e2e`, 18 tests): real flows in Chromium, including a first fight, saving and continuing, the Practice screen, retries and the recap, Llama Forks and DeepSeek Switches, the difficulty unlock, and play while the 3D side is still loading. Any page error fails the test.
- **Simulator invariants:** Guard, HP and Compute never go negative, Context stays within max outside an Overflow, and no card is ever lost or duplicated. A turn with more than 50 plays is treated as an infinite combo and fails.
- **Lint and format:** ESLint and Prettier. The data tables in `src/game/data` are hand-aligned and excluded from Prettier.

## Balance

`npm run sim` plays hundreds of full runs with a greedy bot and reports win rates per character and per boss. To pick the difficulty, add it as the third argument: `npm run sim -- 400 greedy learning`.

The bot's rules:

- It plays a Practice whenever it Counters an enemy on screen, and takes every Practice it is offered.
- It answers scenarios at random, so it makes the best call only about a third of the time.

Win rates over 300–400 runs per character:

| Mode     | Claude | GPT | Gemini | Llama | DeepSeek |
| -------- | ------ | --- | ------ | ----- | -------- |
| Learning | 54%    | 55% | 71%    | 59%   | 67%      |
| Standard | 15%    | 13% | 23%    | 20%   | 19%      |
| Hard     | 8%     | 5%  | 13%    | 11%   | 10%      |

On Standard, the bot beats a boss 19–27% of the time once it reaches it. The bot plays by fixed rules and ignores most mechanics, so read these as relative numbers, not absolute difficulty. Real players should do better.

## Slay the Spire → Slay the Stack

| Slay the Spire            | Slay the Stack                                         |
| ------------------------- | ------------------------------------------------------ |
| Characters                | Frontier models (Claude, GPT, Gemini, Llama, DeepSeek) |
| Enemies                   | Failure modes of coding agents                         |
| Elites                    | Incidents (SEV-2)                                      |
| Act boss                  | SEV-0 incident (one of three)                          |
| HP / Energy / Block       | Uptime / Compute / Guard                               |
| Strength / Dexterity      | Weights / Robustness                                   |
| Vulnerable / Weak / Frail | Exposed / Throttled / Brittle                          |
| Poison                    | Hotpatch                                               |
| Gold / Relics / Potions   | API Credits / Plugins / Scripts                        |
| Rest site (rest / smith)  | Downtime (Sleep / Fine-tune)                           |
| Merchant / ? Events       | Marketplace / Slack threads ("what would you do?")     |
| Card removal              | Deprecate                                              |
| Wounds / Dazed / Burns    | Warnings / Hallucinations / PagerDuty Alerts           |
| Curses                    | Tech Debt                                              |
| _(new)_                   | Practices that Counter a failure mode                  |
| _(new)_                   | Context window, Deep Context, Overflow → Hallucinate   |

## Credits and disclaimer

Slay the Stack is an independent fan project inspired by _Slay the Spire_. It is not affiliated with or endorsed by Mega Crit or by any of the AI companies whose models appear as characters.

Model and company names belong to their owners. They are used only to describe each character's theme, and the failure modes are general to coding agents, not to any one product.

No license has been chosen yet. Until one is, all rights are reserved by the author.
