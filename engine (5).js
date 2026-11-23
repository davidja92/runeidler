(function(root){
 'use strict';const D=typeof module!=='undefined'?require('./content.js'):root.IdleData;
 const methods=Object.fromEntries(D.methods.map(m=>[m.id,m])),monsters=Object.fromEntries(D.monsters.map(m=>[m.id,m]));
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function xpFor(level){let p=0;for(let i=1;i<level;i++)p+=Math.floor(i+300*Math.pow(2,i/7));return Math.floor(p/4);}
 function level(xp){let l=1;while(l<99&&xp>=xpFor(l+1))l++;return l;}
 function fresh(now=Date.now()){return {version:1,name:'Adventurer',xp:Object.fromEntries(D.skills.map(s=>[s,s==='Hitpoints'?1154:0])),bank:{logs:10,shrimp:5,'potato-seed':5},coins:100,capacity:150,upgrades:[],equipped:null,body:null,food:'shrimp',style:'Attack',spell:'wind-strike',buff:null,hp:10,queue:[],plan:[],loop:false,task:null,running:false,progress:0,last:now,stats:{actions:0,kills:{},methods:{},xp:0,coinsEarned:0},pets:{},goals:{},log:[],seed:12345,offlineCap:8*3600000};}
 function log(s,text){s.log.unshift({text,time:Date.now()});s.log=s.log.slice(0,60);}
 function rng(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
 function gain(s,skill,amount){const before=level(s.xp[skill]);s.xp[skill]+=amount;s.stats.xp+=amount;const after=level(s.xp[skill]);if(skill==='Hitpoints')s.hp+=after-before;if(after>before)log(s,skill+' level '+after+'!');}
 function speed(s){return Math.max(0,...D.upgrades.filter(u=>s.upgrades.includes(u.id)).map(u=>u.speed||0));}
 function mastery(s,id){const n=s.stats.methods[id]||0;return n>=2000?3:n>=500?2:n>=100?1:0;}
 function duration(s,m){return Math.round(m.ms*(1-speed(s)-mastery(s,m.id)*.03));}
 function outputs(s,m){if(!m.rune)return m.output;return {[m.rune]:Math.min(8,1+Math.floor(level(s.xp.Runecraft)/m.multiple))};}
 function spell(s){return D.spells.find(x=>x.id===s.spell)||D.spells[0];}
 function total(s){return D.skills.reduce((n,k)=>n+level(s.xp[k]),0);}
 function combatRoster({area='all',tier='all',search=''}={}){const q=String(search).trim().toLowerCase();return D.monsters.filter(m=>(area==='all'||m.dungeon===area)&&(tier==='all'||m.tier===tier)&&(!q||m.name.toLowerCase().includes(q))).sort((a,b)=>a.order-b.order);}
 function combatLevel(s){return Math.floor(.25*(level(s.xp.Defence)+level(s.xp.Hitpoints)+Math.floor(level(s.xp.Prayer)/2))+Math.max(.325*(level(s.xp.Attack)+level(s.xp.Strength)),.325*Math.floor(level(s.xp.Ranged)*1.5),.325*Math.floor(level(s.xp.Magic)*1.5)));}
 function maxHp(s){return level(s.xp.Hitpoints);}
 function combat(s,m){
  const style=s.style,magic=style==='Magic',ranged=style==='Ranged',attack=level(s.xp[magic?'Magic':ranged?'Ranged':'Attack']),strength=level(s.xp[magic?'Magic':ranged?'Ranged':'Strength']);
  const worn=D.items[s.equipped]||{},weapon=(magic?worn.magic:ranged?worn.ranged:worn.weapon)||0,armour=Math.max(0,...D.upgrades.filter(u=>s.upgrades.includes(u.id)).map(u=>u.armour||0))+(D.items[s.body]?.armour||0),focus=magic?Math.max(0,...D.upgrades.filter(u=>s.upgrades.includes(u.id)).map(u=>u.magic||0)):0;
  const currentSpell=spell(s),boost=s.buff?.remaining>0?s.buff.power:0;
  const maxHit=Math.max(1,magic?currentSpell.maxHit+weapon+focus:Math.floor((1+strength/7+weapon*.65)*(1+boost))),accuracy=clamp((attack+12+weapon*3)/(m.defence+attack+20),.15,.95),dps=Math.max(.1,maxHit*.5*accuracy/2.4);
  const seconds=m.hp/dps,incoming=Math.max(.05,(m.maxHit*.5/3)*(m.defence+8)/(level(s.xp.Defence)+armour*8+m.defence+18)),damage=seconds*incoming;
  const heal=D.items[s.food]?.heal||0,need=Math.max(0,Math.ceil((damage-s.hp*.8)/Math.max(1,heal))),available=s.bank[s.food]||0;
  const casts=magic?Math.max(1,Math.ceil(seconds/2.4)):0,runes=magic?Object.fromEntries(Object.entries(currentSpell.costs).map(([id,n])=>[id,n*casts])):{};
  return {maxHit,accuracy,dps,seconds,damage,food:need,casts,runes,spell:magic?currentSpell:null,chance:clamp((s.hp+available*heal)/Math.max(1,damage),0,1),safe:m.maxHit<maxHp(s)*1.25&&(damage<s.hp*.8||available>=need&&heal>0)};
 }
 function bankUsed(s){return Object.values(s.bank).filter(n=>n>0).length;}
 function reason(s,m){
  if(!m)return 'Activity not found.';
  if(level(s.xp[m.skill])<m.level)return 'Requires '+m.skill+' level '+m.level+'.';
  for(const [id,n] of Object.entries(m.inputs))if((s.bank[id]||0)<n)return 'Need '+n+' '+D.items[id].name+'.';
  const next={...s.bank};for(const [id,n] of Object.entries(m.inputs))next[id]=(next[id]||0)-n;for(const [id,n] of Object.entries(outputs(s,m)))next[id]=(next[id]||0)+n;
  if(Object.values(next).filter(n=>n>0).length>s.capacity)return 'Bank full. Sell a stack or add storage.';
  return '';
 }
 function taskReason(s,t){
  if(t?.kind==='combat'){const m=monsters[t.id];if(!m)return 'Monster not found.';if(level(s.xp.Slayer)<m.level)return 'Requires Slayer level '+m.level+'.';const p=combat(s,m);if(p.spell&&level(s.xp.Magic)<p.spell.level)return 'Requires Magic level '+p.spell.level+'.';for(const [id,n] of Object.entries(p.runes))if((s.bank[id]||0)<n)return 'Need '+n+' '+D.items[id].name+'s for '+p.casts+' casts. Mine pure essence and craft more runes.';if(!p.safe)return 'Not ready for this fight. Equip gear or bring more food.';const next={...s.bank};for(const [id,n] of Object.entries(p.runes))next[id]-=n;for(const [id,n] of Object.entries(loot(m)))next[id]=(next[id]||0)+n;if(Object.values(next).filter(n=>n>0).length>s.capacity)return 'Bank full.';return '';}
  return reason(s,methods[t?.id]);
 }
 function start(s,id){const t={id,kind:methods[id]?'skill':'combat',remaining:null};const error=taskReason(s,t);if(error)return error;s.task=t;s.progress=0;s.running=true;return '';}
 function enqueue(s,id,quantity){if(!methods[id])return 'Only skilling activities can be queued.';if(!Number.isInteger(quantity)||quantity<1||quantity>100000)return 'Choose 1–100,000 actions.';if(s.queue.length>=20)return 'Queue holds 20 activities.';s.queue.push({id,kind:'skill',remaining:quantity,total:quantity});return '';}
 function runQueue(s){if(!s.queue.length)return 'Add an activity to the queue first.';s.plan=s.queue.map(v=>({...v}));s.task=null;s.progress=0;s.running=true;return '';}
 function nextTask(s){if(s.task)return true;if(!s.queue.length&&s.loop&&s.plan.length)s.queue=s.plan.map(v=>({...v,remaining:v.total}));if(s.queue.length){s.task=s.queue.shift();return true;}s.running=false;return false;}
 function completeSkill(s,m){
  for(const [id,n] of Object.entries(m.inputs))s.bank[id]-=n;
  for(const [id,n] of Object.entries(outputs(s,m)))s.bank[id]=(s.bank[id]||0)+n;
  gain(s,m.skill,m.xp);s.coins+=m.coins||0;s.stats.coinsEarned+=m.coins||0;s.stats.methods[m.id]=(s.stats.methods[m.id]||0)+1;
  if(!s.pets[m.skill]&&rng(s)<1/5000){s.pets[m.skill]=true;log(s,'A '+m.skill.toLowerCase()+' companion has joined you!');}
  const count=s.stats.methods[m.id];if([100,500,2000].includes(count))log(s,m.name+' mastery '+mastery(s,m.id)+' earned. This activity is now faster.');
  const gems=level(s.xp.Mining)>=40?['sapphire','emerald','ruby','diamond']:['sapphire'],discovery=m.skill==='Mining'?gems[Math.floor(rng(s)*gems.length)]:m.skill==='Woodcutting'?'nest':'supply-crate';if(m.xp>0&&rng(s)<.003&&(s.bank[discovery]||bankUsed(s)<s.capacity)){s.bank[discovery]=(s.bank[discovery]||0)+1;log(s,'You discovered '+D.items[discovery].name.toLowerCase()+'!');}
 }
 function loot(m){if(m.id==='chicken')return {bones:1,feather:5};if(m.id==='cow')return {bones:1,cowhide:1};if(m.name.toLowerCase().includes('dragon'))return {'dragon-bones':1,scale:1};if(m.name.toLowerCase().includes('demon'))return {ashes:1};if(['hill-giant','moss-giant','fire-giant'].includes(m.id))return {'big-bones':1};return {bones:1};}
 function completeCombat(s,m){const p=combat(s,m);for(const [id,n] of Object.entries(p.runes))s.bank[id]-=n;if(p.food){s.bank[s.food]-=p.food;}gain(s,s.style,m.hp*4);gain(s,'Hitpoints',m.hp*1.33);gain(s,'Slayer',m.xp);for(const [id,n] of Object.entries(loot(m)))s.bank[id]=(s.bank[id]||0)+n;s.coins+=m.coins;s.stats.coinsEarned+=m.coins;s.stats.kills[m.id]=(s.stats.kills[m.id]||0)+1;s.hp=clamp(s.hp+(D.items[s.food]?.heal||0)*p.food-p.damage,1,maxHp(s));if(s.buff?.remaining>0){s.buff.remaining--;if(!s.buff.remaining)s.buff=null;}if(rng(s)<.08){const id='guam';if(s.bank[id]||bankUsed(s)<s.capacity)s.bank[id]=(s.bank[id]||0)+1;}if(!s.pets.Slayer&&rng(s)<1/5000)s.pets.Slayer=true;}
 function advance(s,elapsed){
  const report={elapsed:clamp(Number(elapsed)||0,0,s.offlineCap),actions:0,xp:0,coins:0};let remaining=report.elapsed;const xp=s.stats.xp,coins=s.coins;
  if(!s.running||s.task?.kind!=='combat')s.hp=Math.min(maxHp(s),s.hp+report.elapsed/10000);
  while(remaining>0&&s.running){
   if(!nextTask(s))break;const t=s.task,error=taskReason(s,t);if(error){s.running=false;s.progress=0;log(s,error);report.blocked=error;break;}
   const ms=t.kind==='combat'?Math.max(2400,Math.ceil(combat(s,monsters[t.id]).seconds*1000)):duration(s,methods[t.id]);
   const used=Math.min(remaining,Math.max(0,ms-s.progress));s.progress+=used;remaining-=used;if(s.progress<ms)break;
   s.progress=0;if(t.kind==='combat')completeCombat(s,monsters[t.id]);else completeSkill(s,methods[t.id]);s.stats.actions++;report.actions++;
   if(t.remaining!==null){t.remaining--;if(t.remaining<=0)s.task=null;}
  }
  report.xp=s.stats.xp-xp;report.coins=s.coins-coins;return report;
 }
 function sell(s,id,n){n=Math.floor(n);if(!D.items[id]||n<1||(s.bank[id]||0)<n)return 'Not enough items.';s.bank[id]-=n;if(!s.bank[id]&&s.equipped===id)s.equipped=null;if(!s.bank[id]&&s.body===id)s.body=null;const coins=Math.floor(D.items[id].value*n);s.coins+=coins;s.stats.coinsEarned+=coins;return '';}
 function buy(s,id,n){const price=D.shop[id];n=Math.floor(n);if(D.items[id]?.rune)return 'Runes must be crafted from mined pure essence.';if(!price||n<1||n>100000)return 'Invalid purchase.';if(s.coins<price*n)return 'Not enough coins.';if(!s.bank[id]&&bankUsed(s)>=s.capacity)return 'Bank full.';s.coins-=price*n;s.bank[id]=(s.bank[id]||0)+n;return '';}
 function openCrate(s,id){if(!['nest','supply-crate'].includes(id)||!s.bank[id])return 'No cache to open.';const reward=id==='nest'?'sweetcorn-seed':'leather',n=id==='nest'?3:5;const next={...s.bank,[id]:s.bank[id]-1,[reward]:(s.bank[reward]||0)+n};if(Object.values(next).filter(v=>v>0).length>s.capacity)return 'Bank full.';s.bank=next;log(s,'Opened '+D.items[id].name+': '+n+' '+D.items[reward].name+'.');return '';}
 function drink(s,id){if(!['attack-potion','super-attack'].includes(id)||!s.bank[id])return 'No usable potion.';s.bank[id]--;s.buff={remaining:50,power:id==='super-attack'?.25:.15};s.progress=0;log(s,'Attack boosted for 50 fights.');return '';}
 function upgrade(s,id){const u=D.upgrades.find(u=>u.id===id);if(!u||s.upgrades.includes(id))return 'Already owned.';if(s.coins<u.cost)return 'Not enough coins.';s.coins-=u.cost;s.upgrades.push(id);return '';}
 function expand(s){const cost=2000+Math.floor((s.capacity-150)/25)*1000;if(s.coins<cost)return 'Need '+cost.toLocaleString()+' coins.';s.coins-=cost;s.capacity+=25;return '';}
 function goalReady(s,g){return !s.goals[g.id]&&(g.kind==='level'?level(s.xp[g.target]):g.kind==='method'?s.stats.methods[g.target]||0:s.stats.kills[g.target]||0)>=g.amount;}
 function claim(s,id){const g=D.goals.find(g=>g.id===id);if(!g||!goalReady(s,g))return 'Goal not ready.';s.coins+=g.reward;s.goals[id]=true;log(s,'Goal completed: '+g.title);return '';}
 function restore(raw,now=Date.now()){
  if(!raw||raw.version!==1||typeof raw!=='object')throw Error('Unsupported save file.');const s=fresh(now),num=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  if(typeof raw.name!=='string'||raw.name.length>32)throw Error('Invalid character name.');s.name=raw.name;
  for(const k of D.skills){if(!num(raw.xp?.[k],0,2e9))throw Error('Invalid skill XP.');s.xp[k]=raw.xp[k];}
  s.xp.Hitpoints=Math.max(1154,s.xp.Hitpoints);s.bank={};for(const [id,n] of Object.entries(raw.bank||{})){if(!D.items[id]||!num(n,0,1e12)||!Number.isInteger(n))throw Error('Invalid bank contents.');if(n)s.bank[id]=n;}
  for(const k of ['coins','capacity','progress','last','seed']){if(!num(raw[k],0,k==='last'?1e15:1e12))throw Error('Invalid save counters.');s[k]=raw[k];}if(s.capacity<150||s.capacity>10000)throw Error('Invalid bank capacity.');
  s.upgrades=(raw.upgrades||[]).filter(id=>D.upgrades.some(u=>u.id===id));const worn=D.items[raw.equipped];s.equipped=(worn?.weapon||worn?.magic||worn?.ranged)&&s.bank[raw.equipped]?raw.equipped:null;s.body=D.items[raw.body]?.armour&&s.bank[raw.body]?raw.body:null;s.food=D.items[raw.food]?.heal?raw.food:'shrimp';s.style=['Attack','Strength','Defence','Ranged','Magic'].includes(raw.style)?raw.style:'Attack';s.spell=D.spells.some(x=>x.id===raw.spell)?raw.spell:'wind-strike';if(raw.buff&&num(raw.buff.remaining,1,50)&&[.15,.25].includes(raw.buff.power))s.buff={remaining:Math.floor(raw.buff.remaining),power:raw.buff.power};
  const task=t=>{if(!t)return null;if(!methods[t.id]&&!monsters[t.id])throw Error('Invalid activity.');if(t.remaining!==null&&(!num(t.remaining,1,100000)||!Number.isInteger(t.remaining)))throw Error('Invalid action count.');return {id:t.id,kind:methods[t.id]?'skill':'combat',remaining:t.remaining,total:t.total||t.remaining};};
  s.task=task(raw.task);s.queue=(raw.queue||[]).slice(0,20).map(task).filter(Boolean);s.plan=(raw.plan||[]).slice(0,20).map(task).filter(Boolean);s.loop=raw.loop===true;s.running=raw.running===true;
  s.progress=clamp(s.progress,0,s.task?(s.task.kind==='skill'?duration(s,methods[s.task.id]):Math.max(2400,combat(s,monsters[s.task.id]).seconds*1000))-1:0);
  for(const k of ['actions','xp','coinsEarned'])s.stats[k]=num(raw.stats?.[k],0,1e15)?raw.stats[k]:0;
  for(const k of ['methods','kills']){s.stats[k]={};for(const [id,n] of Object.entries(raw.stats?.[k]||{}))if(num(n,0,1e12))s.stats[k][id]=n;}
  for(const k of D.skills)if(raw.pets?.[k]===true)s.pets[k]=true;for(const g of D.goals)if(raw.goals?.[g.id]===true)s.goals[g.id]=true;
  s.log=(raw.log||[]).filter(x=>typeof x.text==='string'&&num(x.time,0,1e15)).slice(0,60);s.hp=num(raw.hp,0,1000)?clamp(raw.hp,1,maxHp(s)):maxHp(s);return s;
 }
 const E={D,methods,monsters,xpFor,level,fresh,gain,total,combatRoster,combatLevel,maxHp,combat,bankUsed,reason,taskReason,start,enqueue,runQueue,advance,duration,mastery,outputs,spell,loot,sell,buy,upgrade,expand,openCrate,drink,goalReady,claim,restore};if(typeof module!=='undefined')module.exports=E;else root.IdleEngine=E;
})(typeof window!=='undefined'?window:globalThis);
