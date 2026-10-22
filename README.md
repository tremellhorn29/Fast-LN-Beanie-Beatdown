# FAST LN: BEANIE BEATDOWN

A lightweight browser beat-'em-up set in **South Cove**. Play instantly in a browser without registering an account. The Beanie HQ hub manages player progression, upgrades, perks, shop items and replayable runs.

## Play

Open `index.html` or serve the folder from the repo root with:

```sh
python3 -m http.server 8000
```

Choose **ENTER BEANIE HQ**, inspect the **RUN**, **BUILD**, **PERKS**, **SHOP** and **RECORD** tabs, then **START LEVEL**. The first run includes dialogue and a tutorial. Clear opponents, defeat the Chairman Lineup boss and reach the exit to finish the run. Earn cash and XP for upgrades and the next attempt.

### Controls

| Action | Keyboard | Mobile | Standard DUALSHOCK/DualSense layout |
| --- | --- | --- | --- |
| Move | A / D or arrows | ◀ / ▶ | Left stick or D-pad |
| Jump | Space / W / Up | ✕ | ✕ |
| Light | J / Enter | □ | □ |
| Heavy | K | △ | △ |
| Dodge | L / Shift | ◯ | ◯ |
| Confirm / dialogue | Click/Enter | A / dialogue button | ✕ |
| HQ tabs | Tap/click | Tabs | L1 / R1 |

Browser controller behavior depends on Gamepad API support. Physical iPhone and controller tests are required before calling hardware support verified.

## Save data

Player progression is local to the browser and stored under `fastLnBeanieBeatdownV5`; a cleared browser profile can lose this progress. Do not change this key or reset player data without an explicit migration path and regression tests. No cloud save or account system is included.

## Files and development

- `index.html`: active entry point; classic scripts loaded in order
- `game.js`: main game loop, player state, world, base enemies and save logic
- `refine.js`: onboarding, refined touch controls and playability helpers
- `boss.js`: Chairman Lineup encounter and persistent boss perks
- `polish.js`: HQ tab interactions and presentation
- `economy.js`: shop inventory, buffs and performance awards
- `tests/browser.cjs`: optional Playwright touch/mobile progression smoke test
- `STUDIO_PLAYBOOK.md`: FAST LN cross-game engineering standards and release gates

The script order matters: some later files wrap existing functions. Do not edit one wrapper without checking its callers and subsequent overrides. Future refactoring should replace those wrappers with explicit modules and test their combined behavior first.

### Automated QA

GitHub Actions runs JavaScript syntax checks and a mobile browser smoke on pull requests. For a local browser test:

```sh
npm install --no-save playwright@1.56.1
npx playwright install chromium
python3 -m http.server 8000
# From another terminal
node tests/browser.cjs
```

Manual release review must also include iPhone portrait, landscape, Safari controller behavior, persistent saves and complete boss/reward flow. An automated green check alone is not a full device-certification.
