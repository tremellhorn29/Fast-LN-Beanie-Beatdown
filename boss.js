(() => {
  // Version 8: Chairman Lineup boss encounter + permanent boss perks.
  save.bossPerks = Object.assign({heavyHands:0, cleanCounter:0, shopTax:0}, save.bossPerks || {});
  persist();

  let boss = null;
  let bossSpawned = false;
  let bossDefeated = false;
  let completionPending = false;
  let counterReady = false;
  let lastBossPhase = 1;
  let selectedReward = 0;
  const gameWrap = document.getElementById('gameWrap');

  const style = document.createElement('style');
  style.textContent = `
    .boss-banner{position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:8;width:min(92%,680px);padding:12px 18px;border:3px solid #000;background:#7f1d1d;color:#fff;text-align:center;box-shadow:6px 6px 0 #000;font-family:system-ui,sans-serif;font-weight:900;letter-spacing:.08em;animation:bossPop .35s ease both}.boss-banner small{display:block;font-weight:600;letter-spacing:.02em;opacity:.82}.boss-perk-modal{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:14px;background:#07080dcc;touch-action:pan-y;overflow-y:auto}.boss-perk-panel{width:min(94%,820px);max-height:94%;overflow-y:auto;padding:20px;border:4px solid #ff7a1a;background:#11131b;box-shadow:10px 10px 0 #000;text-align:center;font-family:system-ui,sans-serif}.boss-perk-panel h2{font-family:Impact,system-ui,sans-serif;font-size:clamp(30px,8vw,54px);margin:.2em 0;color:#ff7a1a}.boss-choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.boss-choice{min-width:0;padding:16px 12px;border:3px solid #000;background:#23293a;color:#fff;box-shadow:4px 4px 0 #000;text-align:left}.boss-choice b,.boss-choice span,.boss-choice em{display:block}.boss-choice b{font-size:18px;color:#3ee07b}.boss-choice span{font-size:13px;line-height:1.4;margin:6px 0;opacity:.85}.boss-choice em{font-style:normal;color:#ffca68;font-weight:800}.boss-choice.selected,.boss-choice:focus{outline:3px solid #fff;background:#3b254f;transform:translateY(-2px)}.boss-loadout{margin-top:12px;padding:12px;border:2px solid #000;background:#191d29;font-family:system-ui,sans-serif}.boss-loadout strong{color:#ff7a1a}.boss-health{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:7;width:min(76%,650px);height:24px;border:3px solid #000;background:#2b1212;box-shadow:4px 4px 0 #000}.boss-health-fill{height:100%;width:100%;background:linear-gradient(90deg,#ef4444,#ff7a1a);transition:width .12s linear}.boss-health-label{position:absolute;inset:0;display:grid;place-items:center;font:900 11px system-ui,sans-serif;letter-spacing:.1em;color:#fff;text-shadow:1px 1px #000}.hidden{display:none!important}@keyframes bossPop{from{opacity:0;transform:translate(-50%,-18px) scale(.9)}to{opacity:1;transform:translateX(-50%) scale(1)}}
    @media(max-width:700px){.boss-choice-grid{grid-template-columns:1fr}.boss-perk-panel{padding:15px}.boss-banner{top:48px;font-size:13px}.boss-health{width:86%;top:5px}}
  `;
  document.head.appendChild(style);

  const healthBar = document.createElement('div');
  healthBar.className = 'boss-health hidden';
  healthBar.innerHTML = '<div class="boss-health-fill"></div><div class="boss-health-label">CHAIRMAN LINEUP</div>';
  gameWrap.appendChild(healthBar);
  const healthFill = healthBar.querySelector('.boss-health-fill');
  const healthLabel = healthBar.querySelector('.boss-health-label');

  const banner = document.createElement('div');
  banner.className = 'boss-banner hidden';
  banner.innerHTML = 'CHAIRMAN LINEUP HAS ENTERED THE DEBATE<small>“Then you are leaving with one side higher than the other.”</small>';
  gameWrap.appendChild(banner);

  const rewardModal = document.createElement('div');
  rewardModal.className = 'boss-perk-modal hidden';
  rewardModal.innerHTML = `
    <div class="boss-perk-panel">
      <p class="eyebrow">BOSS LESSON EARNED</p>
      <h2>CHOOSE YOUR TAKEAWAY</h2>
      <p>Chairman Lineup lost the argument. Keep one permanent technique.</p>
      <div class="boss-choice-grid">
        <button class="boss-choice" data-boss-perk="heavyHands"><b>HEAVY HANDS</b><span>Heavy attacks gain +25% damage per rank and stronger knockback.</span><em>Rank <i data-rank="heavyHands">0</i></em></button>
        <button class="boss-choice" data-boss-perk="cleanCounter"><b>CLEAN COUNTER</b><span>Dodging primes the next hit for +50% damage per rank.</span><em>Rank <i data-rank="cleanCounter">0</i></em></button>
        <button class="boss-choice" data-boss-perk="shopTax"><b>SHOP TAX</b><span>Boss victories add a growing cash bonus to the completion payout.</span><em>Rank <i data-rank="shopTax">0</i></em></button>
      </div>
      <p class="controls-note">Touch a reward, or use D-pad / stick and ✕.</p>
    </div>`;
  gameWrap.appendChild(rewardModal);
  const rewardButtons = [...rewardModal.querySelectorAll('.boss-choice')];

  const perkCard = document.querySelector('.ability-card');
  const loadout = document.createElement('div');
  loadout.className = 'boss-loadout';
  loadout.innerHTML = '<strong>BOSS LESSONS</strong><div id="bossPerkSummary">No named boss perks earned yet.</div>';
  perkCard.appendChild(loadout);

  function renderBossPerks(){
    rewardModal.querySelectorAll('[data-rank]').forEach(node => node.textContent = save.bossPerks[node.dataset.rank] || 0);
    const earned = Object.entries(save.bossPerks).filter(([,rank]) => rank > 0);
    document.getElementById('bossPerkSummary').textContent = earned.length
      ? earned.map(([key,rank]) => `${key==='heavyHands'?'Heavy Hands':key==='cleanCounter'?'Clean Counter':'Shop Tax'} R${rank}`).join(' · ')
      : 'No named boss perks earned yet.';
  }
  renderBossPerks();

  const previousRefreshHQ = refreshHQ;
  refreshHQ = function(){ previousRefreshHQ(); renderBossPerks(); };

  function showBanner(text, sub){
    banner.innerHTML = `${text}<small>${sub || ''}</small>`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 2300);
  }

  function spawnBoss(){
    if(bossSpawned || gameOver || levelComplete) return;
    bossSpawned = true;
    const scale = 1 + save.runs * .16;
    const hp = Math.ceil(22 * scale);
    boss = {x:2180,y:342,w:72,h:88,hp,maxHp:hp,dir:-1,speed:108+save.runs*2,attackTimer:0,attackCooldown:.15,hitFlash:0,boss:true,phase:1};
    enemies.push(boss);
    ui.mission.textContent = 'BOSS: Chairman Lineup';
    healthBar.classList.remove('hidden');
    showBanner('CHAIRMAN LINEUP: FINAL CONSULTATION','Dodge the red attack arc, then punish the opening.');
    navigator.vibrate?.([30,40,70]);
  }

  const previousStartRun = startRun;
  startRun = function(){
    boss = null; bossSpawned = false; bossDefeated = false; completionPending = false; counterReady = false; lastBossPhase = 1;
    healthBar.classList.add('hidden'); rewardModal.classList.add('hidden'); banner.classList.add('hidden');
    previousStartRun();
  };

  const previousUpdate = update;
  update = function(dt){
    const dodgeBefore = player.dodgeTimer;
    const normalAliveBefore = enemies.filter(e => !e.boss && e.hp > 0).length;
    if(!bossSpawned && enemies.length && normalAliveBefore === 0) spawnBoss();

    previousUpdate(dt);

    if(dodgeBefore <= 0 && player.dodgeTimer > 0 && save.bossPerks.cleanCounter > 0){
      counterReady = true;
      showBanner('CLEAN COUNTER READY','Your next connected hit is empowered.');
    }

    if(boss && boss.hp > 0){
      const ratio = boss.hp / boss.maxHp;
      boss.phase = ratio <= .3 ? 3 : ratio <= .62 ? 2 : 1;
      if(boss.phase !== lastBossPhase){
        lastBossPhase = boss.phase;
        if(boss.phase === 2){ boss.speed *= 1.15; showBanner('PHASE 2: SHOP DEBATE','Chairman Lineup is moving faster.'); }
        if(boss.phase === 3){ boss.speed *= 1.18; showBanner('PHASE 3: CRISPY LINE MODE','Final attacks arrive quickly—watch the red arc.'); }
      }
      if(boss.phase === 2) boss.attackCooldown = Math.min(boss.attackCooldown, .5);
      if(boss.phase === 3) boss.attackCooldown = Math.min(boss.attackCooldown, .32);
      healthFill.style.width = Math.max(0, ratio * 100) + '%';
      healthLabel.textContent = `CHAIRMAN LINEUP · PHASE ${boss.phase}`;
      ui.mission.textContent = `Defeat Chairman Lineup · Phase ${boss.phase}`;
    }

    if(boss && boss.hp <= 0 && !bossDefeated){
      bossDefeated = true;
      healthBar.classList.add('hidden');
      ui.mission.textContent = 'Chairman defeated — reach the green exit';
      showBanner('THE CHAIRMAN HAS BEEN OUTVOTED','Reach the green exit to claim a boss lesson.');
      navigator.vibrate?.([45,35,45,35,100]);
    }
  };

  const previousHitEnemy = hitEnemy;
  hitEnemy = function(enemy, base, force){
    let tunedBase = base;
    let tunedForce = force;
    const heavy = base > 1.25;
    if(heavy && save.bossPerks.heavyHands > 0){
      tunedBase *= 1 + save.bossPerks.heavyHands * .25;
      tunedForce *= 1 + save.bossPerks.heavyHands * .12;
    }
    if(counterReady){
      tunedBase *= 1 + save.bossPerks.cleanCounter * .5;
      counterReady = false;
    }
    previousHitEnemy(enemy, tunedBase, tunedForce);
  };

  function selectReward(index){
    selectedReward = (index + rewardButtons.length) % rewardButtons.length;
    rewardButtons.forEach((button,i) => button.classList.toggle('selected', i === selectedReward));
    rewardButtons[selectedReward].focus({preventScroll:true});
  }

  function claimReward(key){
    save.bossPerks[key] = (save.bossPerks[key] || 0) + 1;
    persist(); renderBossPerks();
    rewardModal.classList.add('hidden');
    completionPending = false;
    const cashBefore = save.cash;
    previousFinishLevel();
    let bossBonus = 0;
    if(key === 'shopTax'){
      bossBonus = 75 * save.bossPerks.shopTax;
      save.cash += bossBonus;
      persist();
    }
    const label = key === 'heavyHands' ? 'Heavy Hands' : key === 'cleanCounter' ? 'Clean Counter' : 'Shop Tax';
    ui.reward.innerHTML += `<br><strong>Boss perk: ${label} Rank ${save.bossPerks[key]}</strong>${bossBonus ? `<br>Shop Tax bonus: +$${bossBonus}` : ''}`;
    refreshHQ();
  }

  rewardButtons.forEach((button,index) => button.addEventListener('click', () => claimReward(button.dataset.bossPerk)));

  const previousFinishLevel = finishLevel;
  finishLevel = function(){
    if(!bossDefeated || completionPending || levelComplete) return;
    completionPending = true;
    running = false;
    renderBossPerks();
    rewardModal.classList.remove('hidden');
    selectReward(0);
    draw();
  };

  const previousDraw = draw;
  draw = function(){
    previousDraw();
    if(!boss || boss.hp <= 0) return;
    const sx = boss.x - cameraX;
    // Barber cape, tall beanie, clippers and phase glow layered over the base enemy.
    ctx.save();
    ctx.fillStyle = boss.phase === 3 ? '#ff7a1a' : boss.phase === 2 ? '#8b5cf6' : '#111827';
    ctx.beginPath(); ctx.roundRect(sx-8,boss.y+20,boss.w+16,boss.h*.72,18); ctx.fill();
    ctx.fillStyle = '#0b0d13'; ctx.fillRect(sx+12,boss.y-14,boss.w-24,18);
    ctx.fillStyle = '#d1d5db'; ctx.fillRect(sx+boss.w-4,boss.y+30,24,9);
    ctx.fillStyle = '#111'; ctx.fillRect(sx+boss.w+14,boss.y+27,8,15);
    if(boss.phase >= 2){ctx.strokeStyle=boss.phase===3?'#ff7a1a':'#8b5cf6';ctx.lineWidth=4;ctx.strokeRect(sx-10,boss.y-18,boss.w+20,boss.h+24)}
    ctx.restore();
  };

  // Independent boss-reward gamepad navigation so the existing controller loop remains intact.
  const bossPadPrev = [];
  function bossPadLoop(){
    if(!rewardModal.classList.contains('hidden')){
      const gp = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find(Boolean);
      if(gp){
        const axis = gp.axes?.[0] || 0;
        const left = !!gp.buttons?.[14]?.pressed || axis < -.55;
        const right = !!gp.buttons?.[15]?.pressed || axis > .55;
        const confirm = !!gp.buttons?.[0]?.pressed;
        if(left && !bossPadPrev[14]) selectReward(selectedReward-1);
        if(right && !bossPadPrev[15]) selectReward(selectedReward+1);
        if(confirm && !bossPadPrev[0]) rewardButtons[selectedReward].click();
        bossPadPrev[14]=left;bossPadPrev[15]=right;bossPadPrev[0]=confirm;
      }
    }
    requestAnimationFrame(bossPadLoop);
  }
  requestAnimationFrame(bossPadLoop);
})();