(() => {
  const $ = id => document.getElementById(id);
  const menu = $('menuScreen');
  const grid = menu?.querySelector('.hq-grid');
  if (!menu || !grid || typeof save === 'undefined') return;

  // Version 9 progression guardrails. Existing legacy ranks remain visible,
  // but future regular perk purchases stop at Rank 3.
  const CORE_CAP = 3;
  const BOSS_CAP = 3;
  save.masteryFragments = save.masteryFragments || 0;

  const cards = {
    record: menu.querySelector('.character-card'),
    build: menu.querySelector('.build-card'),
    perks: menu.querySelector('.ability-card'),
    run: menu.querySelector('.mission-card')
  };

  const tabs = document.createElement('nav');
  tabs.className = 'hq-tabs';
  tabs.setAttribute('aria-label', 'Beanie HQ sections');
  tabs.innerHTML = `
    <button data-hq-tab="run" class="active">RUN</button>
    <button data-hq-tab="build">BUILD</button>
    <button data-hq-tab="perks">PERKS</button>
    <button data-hq-tab="record">RECORD</button>`;
  menu.querySelector('.hq-header').insertAdjacentElement('afterend', tabs);

  function openTab(name) {
    Object.entries(cards).forEach(([key, card]) => {
      if (card) card.classList.toggle('hq-card-active', key === name);
    });
    tabs.querySelectorAll('button').forEach(button => {
      const active = button.dataset.hqTab === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    menu.scrollTo({ top: 0, behavior: 'smooth' });
  }
  tabs.querySelectorAll('button').forEach(button => button.onclick = () => openTab(button.dataset.hqTab));
  openTab('run');

  // Quick career summary on the run tab.
  const runSummary = document.createElement('div');
  runSummary.className = 'run-summary';
  cards.run.insertBefore(runSummary, cards.run.firstChild);

  // Replace the outdated fixed tutorial box with live guidance.
  const buildHint = cards.run.querySelector('.build-hint');
  function updateGuidance() {
    const points = Number(save.points || 0);
    const tokens = Number(save.perkPoints || 0);
    if (!buildHint) return;
    if (points || tokens) {
      buildHint.innerHTML = `<b>UPGRADES READY</b><span>${points ? `${points} attribute point${points === 1 ? '' : 's'}` : ''}${points && tokens ? ' and ' : ''}${tokens ? `${tokens} perk token${tokens === 1 ? '' : 's'}` : ''} available. Spend them in BUILD or PERKS, or begin now.</span>`;
      buildHint.classList.add('attention');
    } else {
      buildHint.innerHTML = '<b>BUILD READY</b><span>No unspent points. Chairman Lineup is waiting.</span>';
      buildHint.classList.remove('attention');
    }
  }

  const perkMeta = {
    pressure: rank => `Current effect: +${rank * 12}% total damage`,
    collector: rank => `Current effect: +${rank * 15}% completion cash`,
    secondWind: rank => `Current effect: restore ${rank * 8} HP per knockout`,
    momentum: rank => `Current effect: +${rank * 5}% XP per active streak step`
  };

  function updatePerkCards() {
    document.querySelectorAll('[data-perk]').forEach(button => {
      const key = button.dataset.perk;
      const rank = Number(save.perks?.[key] || 0);
      const effect = button.querySelector('span');
      const rankNode = button.querySelector('em');
      if (effect && perkMeta[key]) effect.textContent = perkMeta[key](rank);
      if (rankNode) rankNode.textContent = rank >= CORE_CAP ? `MASTERED · R${rank}` : `Rank ${rank}/${CORE_CAP}`;
      button.disabled = Number(save.perkPoints || 0) < 1 || rank >= CORE_CAP;
      button.classList.toggle('mastered', rank >= CORE_CAP);
    });

    const bossSummary = document.getElementById('bossPerkSummary');
    if (bossSummary && save.bossPerks) {
      const h = Number(save.bossPerks.heavyHands || 0);
      const c = Number(save.bossPerks.cleanCounter || 0);
      const s = Number(save.bossPerks.shopTax || 0);
      bossSummary.innerHTML = `
        <span><b>Heavy Hands ${h >= BOSS_CAP ? 'MASTERED' : `R${h}/${BOSS_CAP}`}</b> · +${h * 25}% heavy damage</span>
        <span><b>Clean Counter ${c >= BOSS_CAP ? 'MASTERED' : `R${c}/${BOSS_CAP}`}</b> · +${c * 50}% next-hit damage</span>
        <span><b>Shop Tax ${s >= BOSS_CAP ? 'MASTERED' : `R${s}/${BOSS_CAP}`}</b> · +$${s * 75} boss payout</span>`;
    }
  }

  // Core perk buttons receive explicit capped purchase behavior.
  document.querySelectorAll('[data-perk]').forEach(button => {
    button.onclick = () => {
      const key = button.dataset.perk;
      const rank = Number(save.perks?.[key] || 0);
      if (Number(save.perkPoints || 0) < 1 || rank >= CORE_CAP) return;
      save.perkPoints--;
      save.perks[key] = rank + 1;
      persist();
      refreshHQ();
      updateAll();
      navigator.vibrate?.(18);
    };
  });

  function updateRunSummary() {
    const pressure = (1 + Number(save.runs || 0) * .18).toFixed(1);
    runSummary.innerHTML = `
      <div><small>LEVEL</small><strong>${save.level}</strong></div>
      <div><small>BEST STREAK</small><strong>${save.bestStreak}</strong></div>
      <div><small>PRESSURE</small><strong>${pressure}×</strong></div>
      <div><small>BOSS WINS</small><strong>${save.wins}</strong></div>`;
  }

  function updateAll() {
    updateRunSummary();
    updateGuidance();
    updatePerkCards();
  }

  const priorRefresh = refreshHQ;
  refreshHQ = function () {
    priorRefresh();
    updateAll();
  };

  // Performance tracking for a lightweight end-of-run grade.
  let runStartedAt = 0;
  let startingHealth = 0;
  let lowestHealth = 0;
  let gradeAttached = false;

  const priorStart = startRun;
  startRun = function () {
    gradeAttached = false;
    runStartedAt = performance.now();
    priorStart();
    startingHealth = Number(player.maxHealth || player.health || 100);
    lowestHealth = Number(player.health || startingHealth);
  };

  function gradeRun() {
    const seconds = Math.max(1, (performance.now() - runStartedAt) / 1000);
    const remaining = Math.max(0, Number(player.health || 0));
    const healthRatio = startingHealth ? remaining / startingHealth : 0;
    let score = 0;
    if (healthRatio >= .8) score += 2;
    else if (healthRatio >= .5) score += 1;
    if (seconds <= 85) score += 2;
    else if (seconds <= 130) score += 1;
    if (Number(save.streak || 0) >= 3) score += 1;
    const grade = score >= 5 ? 'S' : score >= 4 ? 'A' : score >= 2 ? 'B' : 'C';
    const label = grade === 'S' ? 'NO REPETITION NECESSARY' : grade === 'A' ? 'COMMUNITY PERSUADED' : grade === 'B' ? 'OFFER DELIVERED' : 'EXPLANATION UNCLEAR';
    return { grade, label, seconds: Math.round(seconds), remaining, lowestHealth };
  }

  function monitorRun() {
    if (screens?.game?.classList.contains('active') && typeof player !== 'undefined') {
      lowestHealth = Math.min(lowestHealth || player.health, Number(player.health || 0));
    }
    const endVisible = ui?.end && !ui.end.classList.contains('hidden');
    const rewardVisible = ui?.reward && ui.reward.textContent.trim().length > 0;
    if (endVisible && rewardVisible && levelComplete && !gradeAttached) {
      gradeAttached = true;
      const result = gradeRun();
      const gradeBox = document.createElement('div');
      gradeBox.className = `performance-grade grade-${result.grade.toLowerCase()}`;
      gradeBox.innerHTML = `<strong>${result.grade}</strong><span>${result.label}</span><small>${result.seconds}s · ${result.remaining} HP remaining</small>`;
      ui.reward.prepend(gradeBox);
    }
    requestAnimationFrame(monitorRun);
  }
  requestAnimationFrame(monitorRun);

  // Controller shoulder buttons switch HQ tabs; D-pad remains available for boss rewards.
  const tabNames = ['run', 'build', 'perks', 'record'];
  let tabIndex = 0;
  const prev = { l1: false, r1: false };
  function tabPadLoop() {
    if (screens?.menu?.classList.contains('active')) {
      const gp = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find(Boolean);
      if (gp) {
        const l1 = !!gp.buttons?.[4]?.pressed;
        const r1 = !!gp.buttons?.[5]?.pressed;
        if (l1 && !prev.l1) { tabIndex = (tabIndex + tabNames.length - 1) % tabNames.length; openTab(tabNames[tabIndex]); }
        if (r1 && !prev.r1) { tabIndex = (tabIndex + 1) % tabNames.length; openTab(tabNames[tabIndex]); }
        prev.l1 = l1; prev.r1 = r1;
      }
    }
    requestAnimationFrame(tabPadLoop);
  }
  requestAnimationFrame(tabPadLoop);

  updateAll();
})();