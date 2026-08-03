const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const title=document.getElementById('titleScreen');
const gameScreen=document.getElementById('gameScreen');
const startBtn=document.getElementById('startBtn');
const dialogue=document.getElementById('dialogue');
const dialogueText=document.getElementById('dialogueText');
const speaker=document.getElementById('speaker');
const nextBtn=document.getElementById('dialogueNext');
const healthText=document.getElementById('healthText');
const cashText=document.getElementById('cashText');
const missionText=document.getElementById('missionText');

const keys={left:false,right:false,jump:false,attack:false,heavy:false,dodge:false};
const pad={left:false,right:false,jump:false,attack:false,heavy:false,dodge:false,connected:false,name:'',prev:[]};
let running=false,last=0,cameraX=0,cash=0,gameOver=false,levelComplete=false,started=false;
const world={width:2600,ground:430,exitX:2350};
const player={x:120,y:350,w:54,h:78,vx:0,vy:0,speed:260,jump:590,onGround:false,facing:1,health:100,attackTimer:0,heavyTimer:0,dodgeTimer:0,invuln:0,hitFlash:0};
const enemies=[
 {x:760,y:362,w:52,h:68,hp:4,maxHp:4,dir:-1,speed:86,attackTimer:0,attackCooldown:.5,hitFlash:0},
 {x:1280,y:362,w:52,h:68,hp:4,maxHp:4,dir:-1,speed:92,attackTimer:0,attackCooldown:.8,hitFlash:0},
 {x:1820,y:362,w:52,h:68,hp:6,maxHp:6,dir:-1,speed:78,attackTimer:0,attackCooldown:.3,hitFlash:0}
];
let introIndex=0;
const intro=[['BEANIE','Everybody keep asking what the movement is.'],['LEDGER','Because you still have not explained it.'],['BEANIE','It is simple. Be down… or beat down.'],['LEDGER','That sounds like two different threats.'],['BEANIE','I do not repeat myself. Open the gate.']];

const padStatus=document.createElement('p');
padStatus.className='controls-note';
padStatus.textContent='Controller: press any button after connecting';
startBtn.insertAdjacentElement('afterend',padStatus);

const endCard=document.createElement('div');
endCard.className='dialogue hidden';
endCard.style.textAlign='center';
endCard.innerHTML='<strong>COURTYARD CLEARED</strong><p>South Cove heard the offer. Some joined. Everybody else got the demonstration.</p><p id="finalScore"></p><button id="replayBtn" style="position:static;width:auto;height:auto;border-radius:8px;padding:12px 20px">RUN IT BACK</button>';
document.getElementById('gameWrap').appendChild(endCard);
endCard.querySelector('#replayBtn').addEventListener('click',()=>location.reload());

function showDialogue(lines,index=0){speaker.textContent=lines[index][0];dialogueText.textContent=lines[index][1];dialogue.classList.remove('hidden');introIndex=index;running=false;draw()}
function advanceDialogue(){introIndex++;if(introIndex<intro.length)showDialogue(intro,introIndex);else closeDialogue()}
function closeDialogue(){dialogue.classList.add('hidden');running=true;last=performance.now();requestAnimationFrame(loop)}
nextBtn.addEventListener('click',advanceDialogue);
startBtn.addEventListener('click',()=>{started=true;title.classList.remove('active');gameScreen.classList.add('active');showDialogue(intro,0);draw()});

addEventListener('keydown',e=>{
 if(['ArrowLeft','a','A'].includes(e.key))keys.left=true;
 if(['ArrowRight','d','D'].includes(e.key))keys.right=true;
 if([' ','w','W','ArrowUp'].includes(e.key))keys.jump=true;
 if(['j','J','Enter'].includes(e.key))keys.attack=true;
 if(['k','K'].includes(e.key))keys.heavy=true;
 if(['l','L','Shift'].includes(e.key))keys.dodge=true;
});
addEventListener('keyup',e=>{
 if(['ArrowLeft','a','A'].includes(e.key))keys.left=false;
 if(['ArrowRight','d','D'].includes(e.key))keys.right=false;
 if([' ','w','W','ArrowUp'].includes(e.key))keys.jump=false;
 if(['j','J','Enter'].includes(e.key))keys.attack=false;
 if(['k','K'].includes(e.key))keys.heavy=false;
 if(['l','L','Shift'].includes(e.key))keys.dodge=false;
});

document.querySelectorAll('[data-key]').forEach(btn=>{
 const k=btn.dataset.key;
 const on=e=>{e.preventDefault();keys[k]=true};
 const off=e=>{e.preventDefault();keys[k]=false};
 btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off);
});

function buttonDown(gp,index){return !!gp?.buttons?.[index]?.pressed}
function justPressed(gp,index){const now=buttonDown(gp,index);const once=now&&!pad.prev[index];pad.prev[index]=now;return once}
function controllerLoop(){
 const pads=navigator.getGamepads?navigator.getGamepads():[];
 const gp=Array.from(pads).find(Boolean);
 if(gp){
  if(!pad.connected){pad.connected=true;pad.name=gp.id||'Controller';padStatus.textContent='Controller connected: '+pad.name;}
  const dead=.22,axisX=gp.axes?.[0]||0;
  pad.left=axisX<-dead||buttonDown(gp,14);
  pad.right=axisX>dead||buttonDown(gp,15);
  if(justPressed(gp,0)){
   if(!started)startBtn.click();
   else if(!dialogue.classList.contains('hidden'))advanceDialogue();
   else pad.jump=true;
  }
  if(justPressed(gp,2))pad.attack=true;
  if(justPressed(gp,3))pad.heavy=true;
  if(justPressed(gp,1))pad.dodge=true;
 }else if(pad.connected){pad.connected=false;pad.name='';padStatus.textContent='Controller disconnected';pad.left=pad.right=false;}
 requestAnimationFrame(controllerLoop);
}
requestAnimationFrame(controllerLoop);
addEventListener('gamepadconnected',e=>{pad.connected=true;pad.name=e.gamepad.id||'Controller';padStatus.textContent='Controller connected: '+pad.name;});
addEventListener('gamepaddisconnected',()=>{pad.connected=false;padStatus.textContent='Controller disconnected';});

function hitEnemy(e,damage,force){if(e.hp<=0||e.hitFlash>0)return;e.hp-=damage;e.hitFlash=.15;e.x+=player.facing*force;if(e.hp<=0){cash+=25+(e.maxHp>4?25:0);cashText.textContent='$'+cash;}}
function hurtPlayer(damage,force){if(player.invuln>0||gameOver||levelComplete)return;player.health=Math.max(0,player.health-damage);player.invuln=.75;player.hitFlash=.2;player.vx=force;player.vy=-180;if(player.health<=0){gameOver=true;running=false;missionText.textContent='BEANIE GOT SAT DOWN — refresh to retry';}}
function finishLevel(){levelComplete=true;running=false;missionText.textContent='LEVEL COMPLETE';endCard.querySelector('#finalScore').textContent='Rent fund collected: $'+cash;endCard.classList.remove('hidden');draw();}

function update(dt){
 player.invuln=Math.max(0,player.invuln-dt);player.hitFlash=Math.max(0,player.hitFlash-dt);player.attackTimer=Math.max(0,player.attackTimer-dt);player.heavyTimer=Math.max(0,player.heavyTimer-dt);player.dodgeTimer=Math.max(0,player.dodgeTimer-dt);
 player.vx=0;
 const left=keys.left||pad.left,right=keys.right||pad.right;
 if(player.dodgeTimer<=0){if(left){player.vx=-player.speed;player.facing=-1}if(right){player.vx=player.speed;player.facing=1}}
 if((keys.jump||pad.jump)&&player.onGround){player.vy=-player.jump;player.onGround=false;keys.jump=false;pad.jump=false}
 if((keys.dodge||pad.dodge)&&player.dodgeTimer<=0){player.dodgeTimer=.32;player.invuln=.42;player.vx=player.facing*520;keys.dodge=false;pad.dodge=false}
 if(player.dodgeTimer>0)player.vx=player.facing*520;
 if((keys.attack||pad.attack)&&player.attackTimer<=0&&player.heavyTimer<=0){player.attackTimer=.28;keys.attack=false;pad.attack=false}
 if((keys.heavy||pad.heavy)&&player.heavyTimer<=0&&player.attackTimer<=0){player.heavyTimer=.52;keys.heavy=false;pad.heavy=false}
 player.vy+=1500*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;
 if(player.y+player.h>=world.ground){player.y=world.ground-player.h;player.vy=0;player.onGround=true}
 player.x=Math.max(0,Math.min(world.width-player.w,player.x));
 enemies.forEach(e=>{e.hitFlash=Math.max(0,e.hitFlash-dt);e.attackTimer=Math.max(0,e.attackTimer-dt);e.attackCooldown=Math.max(0,e.attackCooldown-dt);if(e.hp<=0)return;const dx=player.x-e.x,dist=Math.abs(dx);e.dir=Math.sign(dx)||e.dir;if(dist<420&&dist>70)e.x+=e.dir*e.speed*dt;if(dist<=74&&e.attackCooldown<=0){e.attackTimer=.34;e.attackCooldown=1.05}if(e.attackTimer>.16&&e.attackTimer<.22)hurtPlayer(8,e.dir*220);if(dist<82&&Math.abs(player.y-e.y)<84){if(player.attackTimer>.12&&player.attackTimer<.2)hitEnemy(e,1,62);if(player.heavyTimer>.20&&player.heavyTimer<.32)hitEnemy(e,2,110)}});
 cameraX=Math.max(0,Math.min(world.width-canvas.width,player.x-220));
 const alive=enemies.filter(e=>e.hp>0).length;
 if(alive===0){missionText.textContent='Courtyard cleared — reach the green exit';if(player.x>=world.exitX)finishLevel();}
 else if(player.x>2050)missionText.textContent='Defeat Chairman Lineup';else if(player.x>700)missionText.textContent='Clear the courtyard ('+alive+' left)';
 healthText.textContent=player.health+' HP'+(pad.connected?' · DUALSENSE':'');
}

function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x-cameraX,y,w,h)}
function drawBackground(){ctx.fillStyle='#76c6d7';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ffd27d';ctx.fillRect(0,320,canvas.width,220);for(let i=0;i<12;i++){const x=i*240-cameraX*.35;ctx.fillStyle=i%2?'#82563f':'#6f4938';ctx.fillRect(x,150,190,180);ctx.fillStyle='#eac8a8';for(let w=0;w<3;w++)ctx.fillRect(x+24+w*52,190,30,46)}rect(0,world.ground,world.width,110,'#494f5d');for(let i=0;i<world.width;i+=90)rect(i,world.ground+48,55,7,'#f7d66b');ctx.fillStyle='#111';ctx.font='bold 28px system-ui';ctx.fillText('SOUTH COVE COURTYARD',40-cameraX*.15,80)}
function drawBean(x,y,w,h,skin,hoodie,facing=1,enemy=false,flash=false){ctx.save();ctx.translate(x-cameraX+w/2,y+h/2);ctx.scale(facing,1);ctx.fillStyle=flash?'#fff':hoodie;ctx.beginPath();ctx.roundRect(-w/2,-h/4,w,h*.68,22);ctx.fill();ctx.fillStyle=flash?'#fff':skin;ctx.beginPath();ctx.arc(0,-h*.27,w*.34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(-w*.34,-h*.48,w*.68,10);ctx.fillRect(8,-h*.3,5,5);ctx.fillStyle=enemy?'#ef4444':'#f4f4f5';ctx.fillRect(-w*.25,h*.35,w*.22,10);ctx.fillRect(w*.04,h*.35,w*.22,10);ctx.fillStyle=flash?'#fff':skin;ctx.beginPath();ctx.arc(w*.48,0,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-w*.48,0,10,0,Math.PI*2);ctx.fill();ctx.restore()}
function draw(){drawBackground();rect(520,345,120,85,'#7c3aed');rect(1050,300,180,130,'#111827');rect(2050,250,220,180,'#7f1d1d');ctx.fillStyle='#fff';ctx.font='bold 22px system-ui';ctx.fillText('BARBERSHOP',2060-cameraX,290);const alive=enemies.filter(e=>e.hp>0).length;if(alive===0){rect(world.exitX,270,130,160,'#16a34a');ctx.fillStyle='#fff';ctx.font='bold 24px system-ui';ctx.fillText('EXIT',world.exitX-cameraX+32,315)}enemies.forEach(e=>{if(e.hp>0){drawBean(e.x,e.y,e.w,e.h,'#9a623f','#7f1d1d',e.dir,true,e.hitFlash>0);ctx.fillStyle='#111';ctx.fillRect(e.x-cameraX,e.y-12,e.w,6);ctx.fillStyle='#ef4444';ctx.fillRect(e.x-cameraX,e.y-12,e.w*(e.hp/e.maxHp),6);if(e.attackTimer>0){ctx.strokeStyle='#ff4444';ctx.lineWidth=6;ctx.beginPath();ctx.arc(e.x-cameraX+e.w/2+e.dir*30,e.y+34,24,-1,1);ctx.stroke()}}});drawBean(player.x,player.y,player.w,player.h,'#9b6546','#1f2937',player.facing,false,player.hitFlash>0);if(player.attackTimer>0||player.heavyTimer>0){ctx.strokeStyle=player.heavyTimer>0?'#ff7a1a':'#ffe66d';ctx.lineWidth=player.heavyTimer>0?13:8;ctx.beginPath();ctx.arc(player.x-cameraX+player.w/2+player.facing*38,player.y+36,player.heavyTimer>0?42:30,-1,1);ctx.stroke()}}
function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(!gameOver&&!levelComplete)requestAnimationFrame(loop)}
