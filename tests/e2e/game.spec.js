import { expect, test } from '@playwright/test';

// Fails the test on any uncaught page error or console error (web fonts are optional).
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

// Opens the title screen with empty storage, plus any saved keys given (values are JSON-encoded).
async function freshStart(page, saved = {}) {
  await page.goto('/');
  await page.evaluate((saved) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, JSON.stringify(v));
  }, saved);
  await page.reload();
}

// Holds back the 3D side until release() is called.
async function holdStage(page) {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route(/\/src\/stage\/impl\.js/, async (r) => {
    await held;
    await r.continue();
  });
  return release;
}

async function newRun(page, char = 'claude') {
  await freshStart(page);
  await page.click('[data-act="new-run"]');
  await page.click(`[data-act="focus-char"][data-id="${char}"]`);
  await page.click(`[data-act="pick-char"][data-id="${char}"]`);
  await expect(page.locator('.route .n.avail').first()).toBeVisible();
}

test('title → map → first fight: play a card and end the turn', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page, 'gpt');
  await expect(page.locator('.boss-card')).toBeVisible();
  await page.evaluate(() => SS.UI.run.map.nodes[0].forEach((n) => n && (n.type = 'combat')));
  await page.locator('.route .n.avail').first().click();
  await page.waitForFunction(() => SS.UI.screen === 'combat' && !SS.UI.busy);
  await expect(page.locator('.hand .card')).toHaveCount(await page.evaluate(() => SS.UI.c.hand.length));

  const before = await page.evaluate(() => SS.UI.c.stats.played);
  await page.locator('.hand .card:not(.unplayable)').first().click();
  const target = page.locator('.plate.targetable').first();
  if (await target.count()) await target.click();
  await expect.poll(() => page.evaluate(() => SS.UI.c.stats.played)).toBe(before + 1);

  await page.click('[data-act="end-turn"]');
  await page.waitForFunction(() => !SS.UI.busy);
  expect(await page.evaluate(() => SS.UI.c?.turn ?? 'over')).not.toBe(1);
  expect(errors).toEqual([]);
});

test('the chosen boss drives the map, the Incidents and the arena', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page);
  const boss = await page.evaluate(() => SS.UI.run.boss);
  const title = await page.evaluate((b) => SS.ENEMIES[b].title, boss);
  await expect(page.locator('.boss-card .bc-name')).toHaveText(title);
  await page.evaluate(() => SS.debug.startCombat('boss'));
  await page.waitForFunction(() => SS.UI.screen === 'combat' && !SS.UI.busy);
  expect(await page.evaluate(() => SS.UI.c.enemies[0].def.id)).toBe(boss);
  await expect(page.locator('.plate.boss .pname')).toContainText(title);
  expect(errors).toEqual([]);
});

test('Ransomware encrypts cards: they show a lock and cost 1 more', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page);
  await page.evaluate(() => {
    SS.UI.run.boss = 'ransomware';
    SS.UI.run.hp = SS.UI.run.maxHp = 500;
  });
  await page.evaluate(() => SS.debug.startCombat('boss'));
  await page.waitForFunction(() => SS.UI.screen === 'combat' && !SS.UI.busy);
  await expect(page.locator('.ebadge')).toContainText('deadline in 4');

  const cost = await page.evaluate(() => {
    SS.UI.c.encryptCards(2, true);
    SS.debug.render();
    const i = SS.UI.c.hand.findIndex((inst) => inst.enc);
    return SS.cardView(SS.UI.c.hand[i]).cost;
  });
  const locked = page.locator('.hand .card.encrypted');
  await expect(locked).toHaveCount(2);
  await expect(locked.first().locator('.lock')).toBeVisible();
  await expect(locked.first().locator('.cost.up')).toHaveText(String(cost));

  // The enemy turn encrypts more cards (Encrypt Files is its opening move).
  await page.click('[data-act="end-turn"]');
  await page.waitForFunction(() => !SS.UI.busy && SS.UI.c.turn === 2);
  expect(await page.evaluate(() => SS.UI.c.encryptedCount())).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});

test('quitting during the battle intro returns cleanly to the title', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page);
  await page.evaluate(() => {
    SS.debug.startCombat('normal');
  });
  await page.waitForTimeout(150);
  await page.click('[data-act="abandon"]');
  await page.click('[data-act="abandon-yes"]');
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => [SS.UI.screen, SS.UI.run, SS.UI.c])).toEqual(['title', null, null]);
  await expect(page.locator('#wipe')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a drag on the map never commits a move; a click on a 3D node does', async ({ page }) => {
  await newRun(page);
  await page.waitForTimeout(900);
  const key = await page.evaluate(() => {
    const n = SS.ChapterMap.available(SS.UI.run.map, null)[0];
    return `n:${n.row},${n.col}`;
  });
  const pos = await page.evaluate((k) => SS.Stage.screenPos(k), key);
  await page.mouse.move(pos.x, pos.y + 100);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(pos.x, pos.y + 100 - i * 10);
  await page.mouse.up();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => SS.UI.run.pos)).toBeNull();

  // Scroll back (the message box covers the lower edge), then click the node itself.
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(pos.x, pos.y + i * 10);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const at = await page.evaluate((k) => SS.Stage.screenPos(k), key);
  await page.mouse.click(at.x, at.y);
  await page.waitForFunction(() => SS.UI.run.pos !== null, null, { timeout: 5000 });
});

test('a saved run continues after a reload', async ({ page }) => {
  await newRun(page, 'gemini');
  await page.reload();
  await expect(page.locator('[data-act="continue"]')).toBeEnabled();
  await page.click('[data-act="continue"]');
  await expect(page.locator('.route .n.avail').first()).toBeVisible();
  expect(await page.evaluate(() => SS.UI.run.char)).toBe('gemini');
});

test('a defeated enemy leaves the scene for good, even after more cards are played', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page, 'claude');
  await page.evaluate(() => {
    SS.Run.encounter = () => ['hallucinated_api', 'vague_prompt'];
    return SS.debug.startCombat('normal').then(() => {});
  });
  await expect(page.locator('.plate')).toHaveCount(2);
  // Plays an attack; with two enemies alive it needs a target, with one it doesn't.
  const playAt = async (uid) => {
    await page.click('.hand .card[data-idx="0"]');
    if (await page.evaluate(() => SS.UI.c.enemiesAlive().length > 1)) await page.click(`.plate[data-uid="${uid}"]`);
  };
  const [first, second] = await page.evaluate(() => {
    const c = SS.UI.c;
    c.hand = [SS.newCard('cl_critique'), SS.newCard('cl_critique'), SS.newCard('cl_critique')];
    Object.assign(c.enemies[0], { hp: 1, block: 0 });
    SS.debug.render();
    return c.enemies.map((e) => e.uid);
  });
  await playAt(first);
  await expect.poll(() => page.evaluate(() => SS.UI.c.enemies[0].alive)).toBe(false);
  await page.waitForTimeout(1500); // longer than the faint animation
  // The cursor is still over the defeated enemy's nameplate: it must not keep a tooltip up.
  await expect(page.locator('#tooltip')).not.toHaveClass(/show/);
  const played = await page.evaluate(() => SS.UI.c.stats.played);
  await playAt(second);
  await expect.poll(() => page.evaluate(() => SS.UI.c.stats.played)).toBe(played + 1);
  await page.waitForTimeout(300);
  const scene = await page.evaluate(() => ({
    pickables: SS.Stage.currentScene().pickables.length,
    alive: SS.UI.c.enemies.filter((e) => e.alive).length,
  }));
  expect(scene.pickables).toBe(scene.alive);
  expect(errors).toEqual([]);
});

test('a Practice counters its failure mode, and the postmortem teaches the fix', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page, 'gemini');
  await page.evaluate(() => {
    SS.Run.encounter = () => ['sycophancy'];
    return SS.debug.startCombat('normal').then(() => {});
  });
  await page.evaluate(() => {
    const c = SS.UI.c;
    c.hand = [SS.newCard('pr_devil'), SS.newCard('ge_search')];
    SS.debug.render();
  });
  await expect(page.locator('.hand .card.counter-ready')).toHaveCount(1);
  await page.click('.hand .card[data-idx="0"]');
  await expect(page.locator('.plate .intent')).toHaveAttribute('data-tip', /Countered/);
  await expect(page.locator('#msgbox')).toContainText('In real life');

  // Its move is cancelled: ending the turn costs no HP.
  const hp = await page.evaluate(() => SS.UI.c.p.hp);
  await page.click('[data-act="end-turn"]');
  await page.waitForFunction(() => !SS.UI.busy && SS.UI.c.turn === 2);
  expect(await page.evaluate(() => SS.UI.c.p.hp)).toBe(hp);

  await page.evaluate(() => {
    const c = SS.UI.c;
    c.enemies[0].hp = 1;
    c.enemies[0].block = 0;
    c.hand = [SS.newCard('ge_search')];
    SS.debug.render();
  });
  await page.click('.hand .card[data-idx="0"]');
  await expect(page.locator('.postmortem')).toContainText('Sycophancy');
  // It was only in this fight's hand, not the deck, so the reward screen offers it.
  await expect(page.locator('[data-act="take-lesson"][data-id="pr_devil"]')).toHaveCount(1);
  await page.click('.postmortem [data-act="field-guide"]');
  await expect(page.locator('#fg-sycophancy')).toContainText('Why it happens');
  expect(errors).toEqual([]);
});

test('the reward screen offers the Practice for a failure mode you do not have yet', async ({ page }) => {
  await newRun(page, 'claude');
  await page.evaluate(() => {
    SS.Run.encounter = () => ['vague_prompt'];
    return SS.debug.startCombat('normal').then(() => {});
  });
  await page.evaluate(() => {
    const c = SS.UI.c;
    Object.assign(c.enemies[0], { hp: 1, block: 0 });
    c.hand = [SS.newCard('cl_critique')];
    SS.debug.render();
  });
  await page.click('.hand .card[data-idx="0"]');
  await page.click('[data-act="take-lesson"][data-id="pr_specific"]');
  await expect(page.locator('.postmortem')).toContainText('Added');
  expect(await page.evaluate(() => SS.UI.run.deck.filter((c) => c.id === 'pr_specific').length)).toBe(1);
});

test('a Slack scenario hides the outcomes, then grades the answer and rewards the best call', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page, 'claude');
  await page.evaluate(() => {
    SS.Run.pickEvent = () => SS.EVENTS.find((e) => e.id === 'fake_method');
    SS.UI.run.map.nodes[0].forEach((n) => n && (n.type = 'event'));
  });
  await page.locator('.route .n.avail').first().click();
  await expect(page.locator('.slack')).toContainText('JSON.parseSafe');
  await expect(page.locator('[data-act="event-opt"]')).toHaveCount(3);
  // Nothing on the question screen gives the answer away.
  for (const opt of await page.locator('[data-act="event-opt"]').all()) await expect(opt).not.toContainText(/Credits|HP|best/i);
  const credits = await page.evaluate(() => SS.UI.run.credits);
  const best = await page.evaluate(() => SS.UI.event.options.findIndex((o) => o.grade === 'best'));
  await page.click(`[data-act="event-opt"][data-i="${best}"]`);
  await expect(page.locator('.verdict.best')).toContainText('BEST CALL');
  await expect(page.locator('.verdict')).toContainText('Run It');
  expect(await page.evaluate(() => SS.UI.run.deck.some((c) => c.id === 'pr_run'))).toBe(true);
  expect(await page.evaluate(() => SS.UI.run.credits)).toBe(credits + 40);
  await page.click('.verdict [data-act="to-map"]');
  await expect(page.locator('.route')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a scenario missed in an earlier run comes back as a retry, and the run recap lists it', async ({ page }) => {
  const errors = trackErrors(page);
  await newRun(page, 'claude');
  await page.evaluate(() => {
    localStorage.setItem('slay-the-stack-calls-v1', JSON.stringify({ fake_method: 'bad' }));
    SS.UI.run.map.nodes[0].forEach((n) => n && (n.type = 'event'));
  });
  await page.locator('.route .n.avail').first().click();
  await expect(page.locator('.room-title')).toContainText('RETRY');
  await expect(page.locator('.slack')).toContainText('JSON.parseSafe');
  await expect(page.locator('#msgbox')).toContainText('You missed this one before.');
  const ok = await page.evaluate(() => SS.UI.event.options.findIndex((o) => o.grade === 'ok'));
  await page.click(`[data-act="event-opt"][data-i="${ok}"]`);
  await expect(page.locator('.verdict.ok')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('slay-the-stack-calls-v1')))).toEqual({ fake_method: 'ok' });
  await page.evaluate(async () => (await import('/src/ui/flow.js')).gameOver(false, null));
  await expect(page.locator('.recap')).toContainText('Hallucinated API');
  await expect(page.locator('.recap')).toContainText('Best call: Run it or type-check it');
  await page.locator('.rc-chip').first().click();
  await expect(page.locator('.fg-entry.focus')).toContainText('Hallucinated API');
  expect(errors).toEqual([]);
});

// Ad blockers drop requests for common ad-script names (e.g. /gpt.js), and the dev server
// serves every module as its own file, so one blocked name blanks the whole game.
test('boots with an ad blocker that blocks common ad-script names', async ({ page }) => {
  const errors = trackErrors(page);
  const blocked = [];
  await page.route(/\/(gpt|ads?|adsbygoogle|analytics|pixel|banner)\.js(\?|$)/, (r) => {
    blocked.push(r.request().url());
    return r.abort('blockedbyclient');
  });
  await page.goto('/');
  await expect(page.locator('[data-act="new-run"]')).toBeVisible();
  expect(blocked).toEqual([]);
  expect(errors).toEqual([]);
});

test('Llama Forks the last card played; DeepSeek marks the cards that would Switch', async ({ page }) => {
  const errors = trackErrors(page);
  const fight = async (char, hand) => {
    await newRun(page, char);
    await page.evaluate(() => {
      SS.Run.encounter = () => ['infinite_loop'];
      return SS.debug.startCombat('normal');
    });
    await page.waitForFunction(() => SS.UI.screen === 'combat' && !SS.UI.busy);
    await page.evaluate((ids) => {
      SS.UI.c.hand = ids.map((id) => SS.newCard(id));
      SS.UI.c.p.energy = 3;
      SS.debug.render();
    }, hand);
  };

  await fight('llama', ['ll_generate', 'll_fork']);
  await page.locator('.hand .card').first().click();
  await expect(page.locator('.hand .card').first()).toContainText('(Generate)');
  await page.locator('.hand .card').first().click();
  const fork = page.locator('.hand .card.forked');
  await expect(fork).toContainText('FORK');
  await expect(fork.locator('.cost')).toHaveText('0');

  await fight('deepseek', ['ds_infer', 'ds_align', 'ds_coder']);
  await expect(page.locator('.switch-tag')).toHaveCount(0);
  await page.locator('.hand .card').first().click();
  await expect(page.locator('.hand .card:has(.switch-tag) .cname')).toHaveText(['Alignment']);
  expect(errors).toEqual([]);
});

test('Practice deals missed scenarios first, grades them with no run, and records the answer', async ({ page }) => {
  const errors = trackErrors(page);
  await freshStart(page, { 'slay-the-stack-calls-v1': { fake_method: 'bad' } });
  await expect(page.locator('.tile.teal')).toContainText('1 to revisit');
  await page.click('[data-act="practice"]');
  await expect(page.locator('.room-title')).toContainText('PRACTICE 1/12');
  await expect(page.locator('.room-title')).toContainText('RETRY');
  await page.locator('[data-act="practice-opt"]', { hasText: 'Run it or type-check it' }).click();
  await expect(page.locator('.verdict')).toContainText('BEST CALL');
  expect(await page.evaluate(() => [SS.UI.run, JSON.parse(localStorage.getItem('slay-the-stack-calls-v1'))])).toEqual([
    null,
    { fake_method: 'best' },
  ]);
  await page.click('[data-act="practice-next"]');
  await expect(page.locator('.room-title')).toContainText('PRACTICE 2/12');
  expect(errors).toEqual([]);
});

test('new players start on Learning; Hard unlocks after a Standard win', async ({ page }) => {
  await freshStart(page);
  await page.click('[data-act="new-run"]');
  await expect(page.locator('.cs-mode .seg-btn.on')).toContainText('Learning');
  await expect(page.locator('[data-act="pick-mode"][data-id="hard"]')).toBeDisabled();
  await page.click('[data-act="pick-mode"][data-id="standard"]');
  await page.click('[data-act="pick-char"][data-id="claude"]');
  await expect(page.locator('.route .n.avail').first()).toBeVisible();
  expect(await page.evaluate(() => SS.UI.run.mode)).toBe('standard');
  await page.evaluate(async () => (await import('/src/ui/flow.js')).gameOver(true, null));
  await expect(page.locator('.over-mode')).toContainText('Hard mode unlocked!');
  await page.click('[data-act="to-title"]');
  await page.click('[data-act="new-run"]');
  await expect(page.locator('[data-act="pick-mode"][data-id="hard"]')).toBeEnabled();
});

test('players with runs behind them keep Standard when difficulty arrives', async ({ page }) => {
  await freshStart(page, {
    'slay-the-stack-settings-v1': { speed: 1 },
    'slay-the-stack-history-v1': [
      { date: '2026-09-01', char: 'gpt', win: false, floor: 4, killer: 'Scope Creep', seed: 1, deck: 12, bugs: 3 },
    ],
  });
  await page.click('[data-act="new-run"]');
  await expect(page.locator('.cs-mode .seg-btn.on')).toContainText('Standard');
});

test('the menus work before the 3D side loads, and a fight started early waits for it', async ({ page }) => {
  const errors = trackErrors(page);
  const release = await holdStage(page);
  await freshStart(page);
  await page.click('[data-act="new-run"]');
  await page.click('[data-act="pick-char"][data-id="claude"]');
  await expect(page.locator('.route .n.avail').first()).toBeVisible();
  expect(await page.evaluate(() => [SS.Stage.isReady(), document.querySelector('#top-screen').classList.contains('booting')])).toEqual([
    false,
    true,
  ]);

  // A fight started now waits for the 3D side instead of failing.
  await page.evaluate(() => {
    SS.debug.startCombat('normal');
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [SS.UI.screen, SS.UI.busy])).toEqual(['map', true]);
  release();
  await page.waitForFunction(() => SS.UI.screen === 'combat' && !SS.UI.busy, null, { timeout: 15000 });
  expect(await page.evaluate(() => [SS.Stage.currentScene().name, SS.Stage.currentScene().pickables.length > 0])).toEqual(['battle', true]);
  await expect(page.locator('#top-screen')).not.toHaveClass(/booting/);
  expect(errors).toEqual([]);
});

test('when the 3D side lands it shows the latest screen, with handlers set before the load', async ({ page }) => {
  const errors = trackErrors(page);
  const release = await holdStage(page);
  await freshStart(page);
  await page.click('[data-act="new-run"]');
  await page.click('[data-act="pick-char"][data-id="claude"]');
  await expect(page.locator('.route .n.avail').first()).toBeVisible();
  release();
  await page.waitForFunction(() => SS.Stage.isReady(), null, { timeout: 15000 });
  expect(await page.evaluate(() => [SS.Stage.currentScene().name, typeof SS.Stage.currentScene().click])).toEqual(['map', 'function']);
  expect(await page.locator('#ov-world > *').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
