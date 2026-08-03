const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');
const title=$('titleScreen'),menu=$('menuScreen'),gameScreen=$('gameScreen');
const startBtn=$('startBtn'),playBtn=$('playBtn'),returnBtn=$('returnBtn'),resetBtn=$('resetBtn');
const dialogue=$('dialogue'),dialogueText=$('dialogueText'),speaker=$('speaker'),nextBtn=$('dialogueNext'),endCard=$('endCard');
const healthText=$('healthText'),cashText=$('cashText'),missionText=$('missionText');

const defaultSave={cash:0,level:1,rep:0,points:0,clears:0,stats:{strength:1,toughness:1,speed:1,technique:1}};
let save=loadSave();
function loadSave(){try{return {...defaultSave,...JSON.parse(localStorage.getItem('beanieSave')||'{}'),stats:{...defaultSave.stats,...(JSON.parse(localStorage.getItem('beanieSave')||'{}').stats||{})}}}catch{return structuredClone(defaultSave)}}
function storeSave(){localStorage.setItem('beanieSave',JSON.stringify(save))}
function showScreen(screen){[title,menu,gameScreen].forEach(s=>s.classList.remove('active'));screen.classList.add('active')}
function refreshMenu(){
 $('menuCash').textContent='$'+save.cash;$('levelText').textContent=save.level;$('repText').textContent=save.rep;$('pointsText').textContent=save.points;
 Object.keys(save.stats).forEach(k=>$(k+'Text').textContent=save.stats[k]);
 document.querySelectorAll('[data-upgrade]').forEach(b=>b.disabled=save.points<1);
 $('abilityTwo').className='ability '+(save.level>=2?'unlocked':'locked');
 $('abilityTwo').querySelector('span').textContent=save.level>=2?'Counter window improved':'Unlocks at Level 2';
 $('abilityThree').className='ability '+(save.level>=3?'unlocked':'locked');
 $('abilityThree').querySelector('span').textContent=save.level>=3?'Heavy attacks launch enemies':'Unlocks at Level 3';
}
startBtn.onclick=()=>{showScreen(menu);refreshMenu()};
returnBtn.onclick=()=>{endCard.classList.add('hidden');showScreen(menu);refreshMenu()};
resetBtn.onclick=()=>{if(confirm('Erase Beanie progression?')){save=structuredClone(defaultSave);storeSave();refreshMenu()}};
document.querySelectorAll('[data-upgrade]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.upgrade;if(save.points>0){save.stats[k]++;save.points--;storeSave();refreshMenu()}});

const keys={left:false,right:false,jump:false,attack:false,heavy:false,dodge:false};
const pad={left:false,right:false,jump:false,attack:false,heavy:false,dodge:false,connected:false,prev:[]};
let running=false,last=0,cameraX=0,runCash=0,gameOver=false,levelComplete=false,introIndex=0;
const world={width:2600,ground:430,exitX:2350};
let player,enemies;
const intro=[['BEANIE','Everybody keep asking what the movement is.'],['LEDGER','Because you still have not explained it.'],['BEANIE','It is simple. Be down… or beat down.'],['LEDGER','That sounds like two different threats.'],['BEANIE','I do not repeat myself. Open the gate.']];
function resetRun(){
 const hp=90+save.stats.toughness*10;
 player={x:120,y:350,w:54,h:78,vx:0,vy:0,speed:245+save.stats.speed*15,jump:590,onGround:false,facing:1,health:hp,maxHealth:hp,attackTimer:0,heavyTimer:0,dodgeTimer:0,invuln:0,hitFlash:0};
 enemies=[{x:760,y:362,w:52,h:68,hp:4,maxHp:4,dir:-1,speed:86,attackTimer:0,attackCooldown:.5,hitFlash:0},{x:1280,y:362,w:52,h:68,hp:4,maxHp:4,dir:-1,speed:92,attackTimer:0,attackCooldown:.8,hitFlash:0},{x:1820,y:362,w:52,h:68,hp:6,maxHp:6,dir:-1,speed:78,attackTimer:0,attackCooldown:.3,hitFlash:0}];
 runCash=0;cameraX=0;gameOver=false;levelComplete=false;cashText.textContent='$0';missionText.textContent='Reach the courtyard gate';endCard.classList.add('hidden');
}
playBtn.onclick=()=>{resetRun();showScreen(gameScreen);showDialogue(0);draw()};
function showDialogue(i){introIndex=i;speaker.textContent=intro[i][0];dialogueText.textContent=intro[i][1];dialogue.classList.remove('hidden');running=false;draw()}
function advanceDialogue(){introIndex++;introIndex<intro.length?showDialogue(introIndex):closeDialogue()}
function closeDialogue(){dialogue.classList.add('hidden');running=true;last=performance.now();requestAnimationFrame(loop)}
nextBtn.onclick=advanceDialogue;

addEventListener('keydown',e=>{if(['ArrowLeft','a','A'].includes(e.key))keys.left=true;if(['ArrowRight','d','D'].includes(e.key))keys.right=true;if([' ','w','W','ArrowUp'].includes(e.key))keys.jump=true;if(['j','J','Enter'].includes(e.key))keys.attack=true;if(['k','K'].includes(e.key))keys.heavy=true;if(['l','L','Shift'].includes(e.key))keys.dodge=true});
addEventListener('keyup',e=>{if(['ArrowLeft','a','A'].includes(e.key))keys.left=false;if(['ArrowRight','d','D'].includes(e.key))keys.right=false;if([' ','w','W','ArrowUp'].includes(e.key))keys.jump=false;if(['j','J','Enter'].includes(e.key))keys.attack=false;if(['k','K'].includes(e.key))keys.heavy=false;if(['l','L','Shift'].includes(e.key))keys.dodge=false});
document.querySelectorAll('[data-key]').forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();keys[k]=true};const off=e=>{e.preventDefault();keys[k]=false};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off)});

function down(gp,i){return !!gp?.buttons?.[i]?.pressed}
function once(gp,i){const n=down(gp,i),v=n&&!pad.prev[i];pad.prev[i]=n;return v}
function controllerLoop(){
 const gp=Array.from(navigator.getGamepads?navigator.getGamepads():[]).find(Boolean);
 if(gp){pad.connected=true;const x=gp.axes?.[0]||0;pad.left=x<-.22||down(gp,14);pad.right=x>.22||down(gp,15);
  if(once(gp,0)){if(title.classList.contains('active'))startBtn.click();else if(menu.classList.contains('active'))playBtn.click();else if(!dialogue.classList.contains('hidden'))advanceDialogue();else if(!endCard.classList.contains('hidden'))returnBtn.click();else pad.jump=true}
  if(once(gp,1)&&gameScreen.classList.contains('active')&&!endCard.classList.contains('hidden'))returnBtn.click();
  if(once(gp,2))pad.attack=true;if(once(gp,3))pad.heavy=true;if(once(gp,1))pad.dodge=true;
 }else{pad.connected=false;pad.left=pad.right=false}
 requestAnimationFrame(controllerLoop);
}
requestAnimationFrame(controllerLoop);

function hitEnemy(e,heavy=false){if(e.hp<=0||e.hitFlash>0)return;const dmg=heavy?1+save.stats.technique:Math.max(1,save.stats.strength);e.hp-=dmg;e.hitFlash=.15;e.x+=player.facing*(heavy?105:60);if(e.hp<=0){runCash+=e.maxHp>4?50:25;cashText.textContent='$'+runCash}}
function hurtPlayer(dmg,force){if(player.invuln>0||gameOver||levelComplete)return;player.health=Math.max(0,player.health-dmg);player.invuln=.72;player.hitFlash=.2;player.vx=force;player.vy=-180;if(player.health<=0){gameOver=true;running=false;missionText.textContent='BEANIE GOT SAT DOWN — return to HQ';endCard.querySelector('h2').textContent='RUN FAILED';$('rewardSummary').innerHTML='No progression lost.<br>Adjust your build and try again.';endCard.classList.remove('hidden')}}
function finishLevel(){
 levelComplete=true;running=false;const firstClear=save.clears===0;save.cash+=runCash+100;save.rep+=10;save.points+=1;save.clears+=1;save.level=Math.max(save.level,1+Math.floor(save.clears/2));storeSave();
 endCard.querySelector('h2').textContent='COURTYARD CLEARED';$('rewardSummary').innerHTML=`Run cash: $${runCash}<br>Completion bonus: $100<br>Reputation: +10<br>Upgrade points: +1${firstClear?'<br><b>No Repetition path started.</b>':''}`;endCard.classList.remove('hidden');missionText.textContent='LEVEL COMPLETE';draw();
}
function update(dt){
 player.invuln=Math.max(0,player.invuln-dt);player.hitFlash=Math.max(0,player.hitFlash-dt);player.attackTimer=Math.max(0,player.attackTimer-dt);player.heavyTimer=Math.max(0,player.heavyTimer-dt);player.dodgeTimer=Math.max(0,player.dodgeTimer-dt);player.vx=0;
 const left=keys.left||pad.left,right=keys.right||pad.right;if(player.dodgeTimer<=0){if(left){player.vx=-player.speed;player.facing=-1}if(right){player.vx=player.speed;player.facing=1}}
 if((keys.jump||pad.jump)&&player.onGround){player.vy=-player.jump;player.onGround=false;keys.jump=pad.jump=false}
 if((keys.dodge||pad.dodge)&&player.dodgeTimer<=0){player.dodgeTimer=.32;player.invuln=.42;player.vx=player.facing*(500+save.stats.speed*20);keys.dodge=pad.dodge=false}
 if(player.dodgeTimer>0)player.vx=player.facing*(500+save.stats.speed*20);
 if((keys.attack||pad.attack)&&player.attackTimer<=0&&player.heavyTimer<=0){player.attackTimer=.28;keys.attack=pad.attack=false}
 if((keys.heavy||pad.heavy)&&player.heavyTimer<=0&&player.attackTimer<=0){player.heavyTimer=.52;keys.heavy=pad.heavy=false}
 player.vy+=1500*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;if(player.y+player.h>=world.ground){player.y=world.ground-player.h;player.vy=0;player.onGround=true}player.x=Math.max(0,Math.min(world.width-player.w,player.x));
 enemies.forEach(e=>{e.hitFlash=Math.max(0,e.hitFlash-dt);e.attackTimer=Math.max(0,e.attackTimer-dt);e.attackCooldown=Math.max(0,e.attackCooldown-dt);if(e.hp<=0)return;const dx=player.x-e.x,dist=Math.abs(dx);e.dir=Math.sign(dx)||e.dir;if(dist<420&&dist>70)e.x+=e.dir*e.speed*dt;if(dist<=74&&e.attackCooldown<=0){e.attackTimer=.34;e.attackCooldown=1.05}if(e.attackTimer>.16&&e.attackTimer<.22)hurtPlayer(8,e.dir*220);if(dist<82&&Math.abs(player.y-e.y)<84){if(player.attackTimer>.12&&player.attackTimer<.2)hitEnemy(e,false);if(player.heavyTimer>.20&&player.heavyTimer<.32)hitEnemy(e,true)}});
 cameraX=Math.max(0,Math.min(world.width-canvas.width,player.x-220));const alive=enemies.filter(e=>e.hp>0).length;if(alive===0){missionText.textContent='Courtyard cleared — reach the green exit';if(player.x>=world.exitX)finishLevel()}else if(player.x>2050)missionText.textContent='Defeat Chairman Lineup';else if(player.x>700)missionText.textContent='Clear the courtyard ('+alive+' left)';healthText.textContent=player.health+'/'+player.maxHealth+' HP'+(pad.connected?' · DUALSENSE':'');
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x-cameraX,y,w,h)}
function drawBackground(){ctx.fillStyle='#76c6d7';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ffd27d';ctx.fillRect(0,320,canvas.width,220);for(let i=0;i<12;i++){const x=i*240-cameraX*.35;ctx.fillStyle=i%2?'#82563f':'#6f4938';ctx.fillRect(x,150,190,180);ctx.fillStyle='#eac8a8';for(let w=0;w<3;w++)ctx.fillRect(x+24+w*52,190,30,46)}rect(0,world.ground,world.width,110,'#494f5d');for(let i=0;i<world.width;i+=90)rect(i,world.ground+48,55,7,'#f7d66b');ctx.fillStyle='#111';ctx.font='bold 28px system-ui';ctx.fillText('SOUTH COVE COURTYARD',40-cameraX*.15,80)}
function drawBean(x,y,w,h,skin,hoodie,facing=1,enemy=false,flash=false){ctx.save();ctx.translate(x-cameraX+w/2,y+h/2);ctx.scale(facing,1);ctx.fillStyle=flash?'#fff':hoodie;ctx.beginPath();ctx.roundRect(-w/2,-h/4,w,h*.68,22);ctx.fill();ctx.fillStyle=flash?'#fff':skin;ctx.beginPath();ctx.arc(0,-h*.27,w*.34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(-w*.34,-h*.48,w*.68,10);ctx.fillRect(8,-h*.3,5,5);ctx.fillStyle=enemy?'#ef4444':'#f4f4f5';ctx.fillRect(-w*.25,h*.35,w*.22,10);ctx.fillRect(w*.04,h*.35,w*.22,10);ctx.fillStyle=flash?'#fff':skin;ctx.beginPath();ctx.arc(w*.48,0,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-w*.48,0,10,0,Math.PI*2);ctx.fill();ctx.restore()}
function draw(){if(!player)return;drawBackground();rect(520,345,120,85,'#7c3aed');rect(1050,300,180,130,'#111827');rect(2050,250,220,180,'#7f1d1d');ctx.fillStyle='#fff';ctx.font='bold 22px system-ui';ctx.fillText('BARBERSHOP',2060-cameraX,290);const alive=enemies.filter(e=>e.hp>0).length;if(alive===0){rect(world.exitX,270,130,160,'#16a34a');ctx.fillStyle='#fff';ctx.font='bold 24px system-ui';ctx.fillText('EXIT',world.exitX-cameraX+32,315)}enemies.forEach(e=>{if(e.hp>0){drawBean(e.x,e.y,e.w,e.h,'#9a623f','#7f1d1d',e.dir,true,e.hitFlash>0);ctx.fillStyle='#111';ctx.fillRect(e.x-cameraX,e.y-12,e.w,6);ctx.fillStyle='#ef4444';ctx.fillRect(e.x-cameraX,e.y-12,e.w*(e.hp/e.maxHp),6)}});drawBean(player.x,player.y,player.w,player.h,'#9b6546','#1f2937',player.facing,false,player.hitFlash>0);if(player.attackTimer>0||player.heavyTimer>0){ctx.strokeStyle=player.heavyTimer>0?'#ff7a1a':'#ffe66d';ctx.lineWidth=player.heavyTimer>0?13:8;ctx.beginPath();ctx.arc(player.x-cameraX+player.w/2+player.facing*38,player.y+36,player.heavyTimer>0?42:30,-1,1);ctx.stroke()}}
function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(!gameOver&&!levelComplete)requestAnimationFrame(loop)}
refreshMenu();