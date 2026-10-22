// Browser smoke for Beanie Beatdown. Run from repo root after `python3 -m http.server 8000`.
// Install: npm install --no-save playwright && npx playwright install chromium
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:8000", { waitUntil: "load" });
    await page.locator("#startBtn").tap();
    assert.equal(await page.locator("#menuScreen").isVisible(), true, "Opening menu should work on touch");
    assert.equal(await page.locator("#menuCash").textContent(), "$0", "New career must start clean");
    const initialStrength = Number(await page.locator("#strengthText").textContent());
    await page.locator('[data-hq-tab="build"]').tap();
    await page.locator('[data-upgrade="strength"]').tap();
    assert.equal(Number(await page.locator("#strengthText").textContent()), initialStrength + 1, "Attribute upgrade must work");
    await page.locator('[data-hq-tab="perks"]').tap();
    await page.locator('[data-perk="pressure"]').tap();
    assert.match(await page.locator("#pressureRank").textContent(), /(?:1|R1)/, "Perk upgrade must work");
    await page.reload();
    await page.locator("#startBtn").tap();
    await page.locator('[data-hq-tab="build"]').tap();
    assert.equal(Number(await page.locator("#strengthText").textContent()), initialStrength + 1, "Strength must persist across reload");
    await page.locator('[data-hq-tab="perks"]').tap();
    assert.match(await page.locator("#pressureRank").textContent(), /(?:1|R1)/, "Perk must persist across reload");
    await page.locator('[data-hq-tab="run"]').tap();
    await page.locator("#playBtn").tap();
    if (await page.locator("#menuScreen").isVisible()) await page.locator("#playBtn").tap(); // One-time unspent-points reminder.
    assert.equal(await page.locator("#gameScreen").isVisible(), true, "Run must begin");
    for (let i = 0; i < 5; i++) await page.locator("#dialogueNext").tap();
    assert.equal(await page.locator("#dialogue").isVisible(), false, "Dialogue must close into play");
    const helpPanel = page.locator(".help-panel");
    if (await helpPanel.isVisible()) await helpPanel.locator("button").tap();
    const xBefore = await page.evaluate(() => player.x);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowRight");
    assert.ok(await page.evaluate(() => player.x) > xBefore, "Keyboard movement must advance Beanie");
    // Deterministic near-end encounter: no long traversal needed for reward regression.
    await page.evaluate(() => {
      enemies.forEach(enemy => { enemy.hp = 0; });
      update(1/60); // Spawns Chairman Lineup once the courtyard is cleared.
      const boss = enemies.find(enemy => enemy.boss);
      if (!boss) throw new Error("Chairman should spawn");
      boss.hp = 0;
      update(1/60); // Mark boss defeated.
      player.x = world.exitX + 10;
      update(1/60); // Open reward selection.
    });
    const reward = page.locator(".boss-perk-modal");
    await reward.waitFor({ state: "visible", timeout: 2000 });
    await reward.locator('[data-boss-perk="heavyHands"]').tap();
    await page.waitForTimeout(120);
    assert.equal(await page.locator(".performance-grade").count(), 1,
      "Completed run must show only one grade");
    const earned = await page.evaluate(() => ({
      rank: save.bossPerks.heavyHands, cash: save.cash, wins: save.wins,
      bonuses: save.economy.gradeBonuses
    }));
    assert.equal(earned.rank, 1);
    assert.equal(earned.wins, 1);
    await page.evaluate(() => document.querySelector('[data-boss-perk="heavyHands"]').click());
    const afterRepeat = await page.evaluate(() => ({
      rank: save.bossPerks.heavyHands, cash: save.cash, wins: save.wins,
      bonuses: save.economy.gradeBonuses
    }));
    assert.deepEqual(afterRepeat, earned, "Repeated hidden reward clicks must not duplicate payout");
    await page.reload();
    await page.locator("#startBtn").tap();
    assert.equal(await page.locator("#runCount").textContent(), "1 runs",
      "Completed run wins survive reload");
    await page.locator('[data-hq-tab="perks"]').tap();
    assert.match(await page.locator("#bossPerkSummary").textContent(), /Heavy Hands.*R1/,
      "Boss mastery survives reload");

    for (const [width, height] of [[390,844], [844,390], [1280,900]]) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        "No horizontal page overflow at " + width + "×" + height);
    }
    assert.deepEqual(errors, [], "No uncaught browser exceptions");
    console.log("Beanie browser smoke passed: touch HQ, progression, boss reward once, single grade, reload and viewports.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
