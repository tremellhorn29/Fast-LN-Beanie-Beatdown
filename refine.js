(() => {
  const $ = id => document.getElementById(id);
  const gameScreen = $('gameScreen');
  const menuScreen = $('menuScreen');
  const gameWrap = $('gameWrap');
  const playBtn = $('playBtn');
  const endCard = $('endCard');
  const rewardSummary = $('rewardSummary');

  // --- HQ guidance: explain the loop before the player commits to a run.
  const missionCard = document.querySelector('.mission-card');
  const buildHint = document.createElement('div');
  buildHint.className = 'build-hint';
  buildHint.innerHTML = '<b>FIRST MOVE</b><span>Spend attribute points and a perk token above, then start the run. Your choices permanently shape Beanie.</span>';
  missionCard.insertBefore(buildHint, playBtn);

  const originalPlay = playBtn.onclick;
  playBtn.onclick = () => {
    const points = Number($('pointsText')?.textContent || 0);
    const perkPoints = Number($('perkPointsText')?.textContent || 0);
    const hasSeen = sessionStorage.getItem('beanieBuildWarning');
    if (!hasSeen && (points > 0 || perkPoints > 0)) {
      sessionStorage.setItem('beanieBuildWarning', '1');
      buildHint.classList.add('attention');
      buildHint.scrollIntoView({behavior:'smooth', block:'center'});
      playBtn.textContent = 'START ANYWAY';
      return;
    }
    playBtn.textContent = 'START LEVEL';
    originalPlay();
  };

  // --- Mobile controls: expose every combat action instead of hiding heavy/dodge.
  const mobile = document.querySelector('.mobile-controls');
  mobile.innerHTML = `
    <div class="dpad refined-dpad">
      <button data-ref-key="left" aria-label="Move left">◀<small>MOVE</small></button>
      <button data-ref-key="right" aria-label="Move right">▶<small>MOVE</small></button>
    </div>
    <div class="actions refined-actions">
      <button data-ref-key="dodge" class="touch-dodge" aria-label="Dodge">○<small>DODGE</small></button>
      <button data-ref-key="jump" class="touch-jump" aria-label="Jump">✕<small>JUMP</small></button>
      <button data-ref-key="heavy" class="touch-heavy" aria-label="Heavy attack">△<small>HEAVY</small></button>
      <button data-ref-key="attack" class="touch-light" aria-label="Light attack">□<small>LIGHT</small></button>
    </div>`;

  document.querySelectorAll('[data-ref-key]').forEach(btn => {
    const key = btn.dataset.refKey;
    const press = e => {
      e.preventDefault();
      keys[key] = true;
      btn.classList.add('pressed');
      navigator.vibrate?.(12);
    };
    const release = e => {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove('pressed');
    };
    btn.addEventListener('pointerdown', press);
    ['pointerup','pointercancel','pointerleave'].forEach(type => btn.addEventListener(type, release));
  });

  // --- Persistent progress strip during gameplay.
  const progress = document.createElement('div');
  progress.className = 'run-progress';
  progress.innerHTML = '<div class="run-progress-fill"></div><span>COURTYARD RUN</span>';
  gameWrap.prepend(progress);
  const progressFill = progress.querySelector('.run-progress-fill');

  const help = document.createElement('button');
  help.className = 'game-help';
  help.type = 'button';
  help.textContent = '?';
  help.setAttribute('aria-label','Show controls');
  gameWrap.appendChild(help);

  const helpPanel = document.createElement('div');
  helpPanel.className = 'help-panel hidden';
  helpPanel.innerHTML = `
    <strong>HOW TO PLAY</strong>
    <p>Move right, defeat every red opponent, then enter the green EXIT.</p>
    <p><b>□</b> Light · <b>△</b> Heavy · <b>✕</b> Jump · <b>○</b> Dodge</p>
    <button type="button">GOT IT</button>`;
  gameWrap.appendChild(helpPanel);
  help.onclick = () => helpPanel.classList.remove('hidden');
  helpPanel.querySelector('button').onclick = () => helpPanel.classList.add('hidden');

  // Show the compact tutorial once, immediately after dialogue starts a first run.
  const tutorialKey = 'beanieTutorialSeenV7';
  const tutorialWatcher = setInterval(() => {
    if (gameScreen.classList.contains('active') && !localStorage.getItem(tutorialKey) && $('dialogue').classList.contains('hidden')) {
      localStorage.setItem(tutorialKey, '1');
      helpPanel.classList.remove('hidden');
      clearInterval(tutorialWatcher);
    }
  }, 250);

  function usabilityLoop() {
    if (gameScreen.classList.contains('active') && typeof player !== 'undefined' && typeof world !== 'undefined') {
      const pct = Math.max(0, Math.min(100, ((player.x || 0) / world.exitX) * 100));
      progressFill.style.width = pct + '%';
      progress.classList.toggle('complete', typeof enemies !== 'undefined' && enemies.length > 0 && enemies.every(e => e.hp <= 0));
    }
    requestAnimationFrame(usabilityLoop);
  }
  requestAnimationFrame(usabilityLoop);

  // --- Replace abrupt failure return with understandable feedback and a choice.
  if (typeof hurtPlayer === 'function') {
    hurtPlayer = function(dmg, force) {
      if (player.invuln > 0 || gameOver || levelComplete) return;
      player.health = Math.max(0, player.health - dmg);
      player.invuln = .75;
      player.hitFlash = .2;
      player.vx = force;
      player.vy = -180;
      navigator.vibrate?.([25, 25, 40]);
      if (player.health <= 0) {
        gameOver = true;
        running = false;
        save.streak = 0;
        persist();
        ui.mission.textContent = 'RUN FAILED';
        endCard.querySelector('.eyebrow').textContent = 'THE OFFER GOT DECLINED';
        endCard.querySelector('h2').textContent = 'BEANIE GOT SAT DOWN';
        endCard.querySelector('p:not(.eyebrow)').textContent = 'No progress was lost. Rework the build or run it back.';
        rewardSummary.innerHTML = `<b>Run cash collected: $${runCash}</b><br>Win streak reset · Career upgrades preserved`;
        endCard.classList.remove('hidden');
        $('returnBtn').textContent = 'RETURN TO HQ';
        draw();
      }
    };
  }

  // Restore completion language each new run after a failed run.
  const originalStartRun = startRun;
  startRun = function() {
    endCard.querySelector('.eyebrow').textContent = 'RUN COMPLETE';
    endCard.querySelector('h2').textContent = 'COURTYARD CLEARED';
    endCard.querySelector('p:not(.eyebrow)').textContent = 'South Cove heard the offer.';
    $('returnBtn').textContent = 'RETURN TO HQ';
    helpPanel.classList.add('hidden');
    originalStartRun();
  };

  // Prevent accidental reset taps on mobile by requiring a deliberate second tap.
  const reset = $('resetBtn');
  const originalReset = reset.onclick;
  reset.onclick = () => {
    if (reset.dataset.armed !== 'true') {
      reset.dataset.armed = 'true';
      reset.textContent = 'TAP AGAIN TO RESET';
      setTimeout(() => { reset.dataset.armed='false'; reset.textContent='RESET CAREER'; }, 3000);
      return;
    }
    reset.dataset.armed = 'false';
    reset.textContent = 'RESET CAREER';
    originalReset();
  };

  // Bring the HQ back to the top after a run so the refreshed rewards are visible.
  $('returnBtn').addEventListener('click', () => {
    setTimeout(() => menuScreen.scrollTo({top:0, behavior:'smooth'}), 50);
  });
})();