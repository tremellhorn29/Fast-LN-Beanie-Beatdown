(() => {
  const $ = id => document.getElementById(id);
  if (typeof save === 'undefined' || typeof persist !== 'function') return;

  const defaults = {
    inventory:{meal:0,hoodie:0,energy:0,focus:0,insurance:0},
    equipped:{meal:false,hoodie:false,energy:false,focus:false,insurance:false},
    economy:{spent:0,gradeBonuses:0},
    cosmetics:{emeraldJacket:false}
  };
  save.inventory = Object.assign({}, defaults.inventory, save.inventory || {});
  save.equipped = Object.assign({}, defaults.equipped, save.equipped || {});
  save.economy = Object.assign({}, defaults.economy, save.economy || {});
  save.cosmetics = Object.assign({}, defaults.cosmetics, save.cosmetics || {});
  persist();

  const menu = $('menuScreen');
  const tabs = menu?.querySelector('.hq-tabs');
  const grid = menu?.querySelector('.hq-grid');
  if (!tabs || !grid) return;

  const shopTab = document.createElement('button');
  shopTab.dataset.hqTab = 'shop';
  shopTab.textContent = 'SHOP';
  tabs.insertBefore(shopTab, tabs.querySelector('[data-hq-tab="record"]'));

  const shop = document.createElement('section');
  shop.className = 'shop-card hq-card-active';
  shop.innerHTML = `
    <div class="shop-head"><div><p class="eyebrow">SOUTH COVE SUPPLY</p><h3>SPEND THE RENT FUND</h3></div><strong id="shopCash">$0</strong></div>
    <p class="small-copy">Cash now changes your build. Buy one-run preparation, permanent progression, or visible status.</p>
    <div class="shop-loadout" id="shopLoadout"></div>
    <div class="shop-grid">
      <button class="shop-item" data-buy="meal" data-cost="250"><b>STREET MEAL</b><span>Next run: +25% maximum health.</span><em>$250</em></button>
      <button class="shop-item" data-buy="hoodie" data-cost="400"><b>REINFORCED HOODIE</b><span>Next run: reduce incoming damage by 25%.</span><em>$400</em></button>
      <button class="shop-item" data-buy="energy" data-cost="300"><b>ENERGY DRINK</b><span>Next run: +20% movement and dodge distance.</span><em>$300</em></button>
      <button class="shop-item" data-buy="focus" data-cost="450"><b>FOCUS WRAP</b><span>Next run: +25% attack damage.</span><em>$450</em></button>
      <button class="shop-item" data-buy="insurance" data-cost="600"><b>BLOCK INSURANCE</b><span>Next run: revive once at 35% health.</span><em>$600</em></button>
      <button class="shop-item permanent" data-buy="training" data-cost="750"><b>TRAINING SESSION</b><span>Permanent: gain 1 attribute point.</span><em>$750</em></button>
      <button class="shop-item permanent" data-buy="perkToken" data-cost="1200"><b>COMMUNITY SEMINAR</b><span>Permanent: gain 1 core perk token.</span><em>$1,200</em></button>
      <button class="shop-item permanent" data-buy="emeraldJacket" data-cost="2000"><b>EMERALD DIPLOMAT JACKET</b><span>Permanent status cosmetic for Beanie HQ.</span><em>$2,000</em></button>
    </div>`;
  grid.appendChild(shop);

  const style = document.createElement('style');
  style.textContent = `
    .shop-card{background:var(--panel);border:3px solid #000;box-shadow:7px 7px 0 #000;padding:18px;min-width:0}.shop-head{display:flex;justify-content:space-between;gap:14px;align-items:end}.shop-head h3{font-size:clamp(28px,7vw,46px);margin:.15em 0}.shop-head>strong{font:900 34px system-ui;color:var(--green)}.shop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.shop-item{display:grid;grid-template-columns:1fr auto;gap:6px 12px;min-width:0;padding:15px;border:3px solid #000;background:#23293a;color:#fff;text-align:left;box-shadow:4px 4px 0 #000}.shop-item b,.shop-item span{grid-column:1}.shop-item span{font:13px/1.4 system-ui;opacity:.78}.shop-item em{grid-column:2;grid-row:1/3;align-self:center;font-style:normal;font:900 16px system-ui;color:var(--green)}.shop-item.permanent{border-color:#8b5cf6}.shop-item:disabled{opacity:.4}.shop-item.owned{border-color:var(--green);background:#173522}.shop-loadout{margin-top:14px;padding:12px;border:2px solid #000;background:#10131b;font:14px/1.5 system-ui}.shop-loadout b{color:var(--orange)}.performance-grade{margin:0 0 14px;padding:14px;border:3px solid #000;background:#202535;display:grid;grid-template-columns:62px 1fr;gap:2px 12px;text-align:left}.performance-grade>strong{grid-row:1/3;font:900 48px/1 Impact;color:var(--green);align-self:center}.performance-grade span{font-weight:900}.performance-grade small{opacity:.75}.grade-s{border-color:#fbbf24}.grade-a{border-color:#3ee07b}.grade-b{border-color:#60a5fa}.grade-c{border-color:#9ca3af}.grade-money{display:block;color:#3ee07b;font-weight:900;margin-top:4px}.cash-purpose{margin-top:12px;padding:12px;border:2px solid #000;background:#161b26;font:13px/1.45 system-ui}.bean-portrait.emerald:before{background:#065f46;box-shadow:0 -72px 0 -32px #111,0 0 24px #10b981}
    @media(max-width:700px){.shop-grid{grid-template-columns:1fr}.shop-card{padding:14px}.shop-head>strong{font-size:26px}.performance-grade{grid-template-columns:52px 1fr}.performance-grade>strong{font-size:42px}}
  `;
  document.head.appendChild(style);

  const cards = {
    run: menu.querySelector('.mission-card'), build: menu.querySelector('.build-card'), perks: menu.querySelector('.ability-card'), record: menu.querySelector('.character-card'), shop
  };
  function openEconomyTab(name){
    Object.entries(cards).forEach(([key,card]) => card?.classList.toggle('hq-card-active', key===name));
    tabs.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.hqTab===name));
    menu.scrollTo({top:0,behavior:'smooth'});
  }
  shopTab.onclick = () => openEconomyTab('shop');
  tabs.querySelectorAll('button:not([data-hq-tab="shop"])').forEach(btn => btn.addEventListener('click', () => shop.classList.remove('hq-card-active')));

  const labels={meal:'Street Meal',hoodie:'Reinforced Hoodie',energy:'Energy Drink',focus:'Focus Wrap',insurance:'Block Insurance'};
  function renderShop(){
    $('shopCash').textContent='$'+Number(save.cash||0).toLocaleString();
    const active=Object.entries(save.equipped).filter(([,v])=>v).map(([k])=>labels[k]);
    $('shopLoadout').innerHTML=`<b>NEXT-RUN LOADOUT</b><br>${active.length?active.join(' · '):'No preparation equipped. Buy supplies below.'}<br><small>Career cash spent: $${Number(save.economy.spent||0).toLocaleString()} · Grade bonuses earned: $${Number(save.economy.gradeBonuses||0).toLocaleString()}</small>`;
    document.querySelectorAll('[data-buy]').forEach(btn=>{
      const key=btn.dataset.buy,cost=Number(btn.dataset.cost);
      const owned = key==='emeraldJacket' && save.cosmetics.emeraldJacket;
      btn.disabled = Number(save.cash||0)<cost || owned || (save.inventory[key]||0)>0;
      btn.classList.toggle('owned',owned || (save.inventory[key]||0)>0);
      if(owned) btn.querySelector('em').textContent='OWNED';
      else if((save.inventory[key]||0)>0) btn.querySelector('em').textContent='READY';
    });
    document.querySelector('.bean-portrait')?.classList.toggle('emerald',!!save.cosmetics.emeraldJacket);
  }

  document.querySelectorAll('[data-buy]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.buy,cost=Number(btn.dataset.cost);
    if(Number(save.cash||0)<cost)return;
    save.cash-=cost;save.economy.spent+=cost;
    if(key==='training')save.points=(save.points||0)+1;
    else if(key==='perkToken')save.perkPoints=(save.perkPoints||0)+1;
    else if(key==='emeraldJacket')save.cosmetics.emeraldJacket=true;
    else {save.inventory[key]=1;save.equipped[key]=true;}
    persist();refreshHQ();renderShop();navigator.vibrate?.(20);
  });

  const priorRefresh=refreshHQ;
  refreshHQ=function(){priorRefresh();renderShop();};

  let runStart=0,startHP=100,runDamageTaken=0,reviveReady=false,runBoosts={};
  const priorStart=startRun;
  startRun=function(){
    runBoosts=Object.assign({},save.equipped);
    Object.keys(runBoosts).forEach(k=>{if(runBoosts[k]){save.inventory[k]=0;save.equipped[k]=false;}});
    persist();runStart=performance.now();runDamageTaken=0;reviveReady=!!runBoosts.insurance;
    priorStart();
    if(runBoosts.meal){player.maxHealth=Math.round(player.maxHealth*1.25);player.health=player.maxHealth;}
    if(runBoosts.energy)player.speed*=1.2;
    startHP=player.maxHealth;
    ui.health.textContent=player.health+' / '+player.maxHealth+' HP';
  };

  const priorHit=hitEnemy;
  hitEnemy=function(enemy,base,force){priorHit(enemy,runBoosts.focus?base*1.25:base,force);};

  const priorHurt=hurtPlayer;
  hurtPlayer=function(dmg,force){
    const reduced=runBoosts.hoodie?dmg*.75:dmg;
    runDamageTaken+=reduced;
    if(reviveReady && player.health-reduced<=0){
      reviveReady=false;player.health=Math.max(1,Math.round(player.maxHealth*.35));player.invuln=1.2;player.hitFlash=.25;ui.mission.textContent='BLOCK INSURANCE PAID OUT';navigator.vibrate?.([50,40,100]);return;
    }
    priorHurt(reduced,force);
  };

  let gradedForRun=false;
  function gradeAndPay(){
    if(gradedForRun || !levelComplete || ui.end.classList.contains('hidden') || !ui.reward.textContent.trim())return;
    gradedForRun=true;
    const seconds=Math.max(1,(performance.now()-runStart)/1000);
    const ratio=Math.max(0,player.health)/Math.max(1,startHP);
    let score=0;
    if(ratio>=.8)score+=2;else if(ratio>=.5)score+=1;
    if(seconds<=85)score+=2;else if(seconds<=130)score+=1;
    if(runDamageTaken<=startHP*.25)score+=1;
    const grade=score>=5?'S':score>=4?'A':score>=2?'B':'C';
    const multiplier={S:.5,A:.25,B:.1,C:0}[grade];
    const bonus=Math.round((100+Number(save.runs||0)*18)*multiplier);
    const label={S:'NO REPETITION NECESSARY',A:'COMMUNITY PERSUADED',B:'OFFER DELIVERED',C:'EXPLANATION UNCLEAR'}[grade];
    if(bonus){save.cash+=bonus;save.economy.gradeBonuses+=bonus;persist();}
    const box=document.createElement('div');box.className='performance-grade grade-'+grade.toLowerCase();
    box.innerHTML=`<strong>${grade}</strong><span>${label}</span><small>${Math.round(seconds)}s · ${Math.round(player.health)} HP · ${Math.round(runDamageTaken)} damage taken</small><span class="grade-money">Performance bonus: +$${bonus}</span>`;
    ui.reward.prepend(box);refreshHQ();
  }
  const priorStart2=startRun;
  startRun=function(){gradedForRun=false;priorStart2();};
  function gradeLoop(){gradeAndPay();requestAnimationFrame(gradeLoop);}requestAnimationFrame(gradeLoop);

  const purpose=document.createElement('div');purpose.className='cash-purpose';purpose.innerHTML='<b>WHY CASH MATTERS</b><br>Prepare for the next run, buy permanent attribute or perk progression, unlock cosmetics, and protect win streaks.';
  cards.run?.insertBefore(purpose,cards.run.querySelector('.primary'));

  renderShop();
})();