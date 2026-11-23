const assert=require('node:assert/strict'),E=require('../dist/engine.js'),D=E.D;
const fresh=()=>E.fresh(1000);
let s=fresh();assert.equal(E.level(0),1);assert.equal(E.xpFor(2),83);assert.equal(E.level(1154),10);assert.equal(E.total(s),32);assert.equal(E.combatLevel(s),3);
assert.equal(E.start(s,'cut-logs'),'');E.advance(s,2400);assert.equal(s.bank.logs,11);assert.equal(s.xp.Woodcutting,25);assert.equal(s.stats.actions,1);
s=fresh();s.bank={};E.enqueue(s,'cut-logs',2);E.enqueue(s,'shaft',2);E.runQueue(s);E.advance(s,9600);assert.equal(s.bank.logs,0);assert.equal(s.bank.shaft,30);assert.equal(s.xp.Woodcutting,50);assert.equal(s.xp.Fletching,10);
s=fresh();s.bank={};E.enqueue(s,'shaft',1);E.runQueue(s);let report=E.advance(s,10000);assert(!s.running);assert.equal(s.stats.actions,0);assert.match(report.blocked,/Need/);assert.equal(s.progress,0);
s=fresh();s.bank={};E.enqueue(s,'cut-logs',1);E.enqueue(s,'shaft',1);s.loop=true;E.runQueue(s);E.advance(s,24000);assert.equal(s.bank.shaft,75);assert.equal(s.bank.logs,0);
s=fresh();s.bank={};E.start(s,'cut-logs');report=E.advance(s,24*3600000);assert.equal(report.elapsed,8*3600000);assert(s.stats.actions>=12000&&s.stats.actions<14000);assert.equal(s.bank.logs,s.stats.actions);assert(E.level(s.xp.Woodcutting)>1);
s=fresh();s.running=false;E.advance(s,1e6);assert.equal(s.stats.actions,0);assert.match(E.start(s,'cut-yew'),/level/);
s=fresh();s.bank={};s.capacity=1;s.bank.clay=1;assert.match(E.start(s,'cut-logs'),/Bank full/);s.bank={logs:1};assert.equal(E.start(s,'shaft'),'');E.advance(s,2400);assert.equal(s.bank.shaft,15);
s=fresh();s.bank.logs=5;const gold=s.coins;E.sell(s,'logs',5);assert.equal(s.coins,gold+10);assert.equal(s.bank.logs,0);assert.match(E.sell(s,'logs',1),/Not enough/);const bank=JSON.stringify(s.bank);assert.match(E.buy(s,'staff',100),/Not enough/);assert.equal(JSON.stringify(s.bank),bank);
s=fresh();s.coins=1000;E.upgrade(s,'iron-axe');assert.equal(E.duration(s,E.methods['cut-logs']),2208);assert.match(E.upgrade(s,'iron-axe'),/owned/);s.progress=2300;E.start(s,'cut-logs');s.progress=2300;E.advance(s,1);assert.equal(s.stats.actions,1);assert(s.progress>=0);
s=fresh();s.stats.methods['cut-logs']=25;assert(E.goalReady(s,D.goals[0]));E.claim(s,'logs');assert.equal(s.coins,200);assert.match(E.claim(s,'logs'),/ready/);
s=fresh();s.bank['iron-sword']=1;s.equipped='iron-sword';E.sell(s,'iron-sword',1);assert.equal(s.equipped,null);
s=fresh();let low=E.combat(s,E.monsters.rat);s.bank.shrimp=100;s.equipped='steel-sword';s.bank['steel-sword']=1;let better=E.combat(s,E.monsters.rat);assert(better.seconds<low.seconds);E.start(s,'rat');E.advance(s,Math.ceil(better.seconds*1000)+1);assert.equal(s.stats.kills.rat,1);assert(s.xp.Attack>0);assert(s.xp.Hitpoints>1154);assert(s.xp.Slayer>0);assert.equal(s.bank.bones,1);assert(s.bank.shrimp>=0);
s=fresh();E.start(s,'cut-logs');E.advance(s,3600);let restored=E.restore(JSON.parse(JSON.stringify(s)),2000);assert.equal(restored.progress,1200);assert.equal(restored.task.id,'cut-logs');E.advance(restored,1200);assert.equal(restored.stats.actions,2);
for(const edit of [r=>r.xp.Mining=-1,r=>r.bank.logs=-10,r=>r.task={id:'bad',remaining:null},r=>r.coins=Infinity]){const r=fresh();edit(r);assert.throws(()=>E.restore(r));}
for(const m of D.methods){assert(D.skills.includes(m.skill));assert(m.ms>0);assert(m.xp>=0);for(const id of [...Object.keys(m.inputs),...Object.keys(m.output)])assert(D.items[id],id);}
assert.deepEqual(E.combatRoster().slice(0,4).map(m=>m.id),['goblin','chicken','cow','rat']);
assert.equal(E.combatRoster().length,36);assert.equal(new Set(D.monsters.map(m=>m.id)).size,36);
assert.deepEqual(E.combatRoster({area:'lumbridge'}).map(m=>m.id),['goblin','chicken','cow','man']);
assert(E.combatRoster({tier:'Starter'}).every(m=>m.level===1));
assert.deepEqual(E.combatRoster({search:'  abyssal  '}).map(m=>m.id),['abyssal-demon']);
assert.equal(E.combatRoster({area:'missing'}).length,0);
assert(E.combatRoster({tier:'Endgame'}).every(m=>m.level>=75));
for(const id of ['rat','goblin','skeleton','pirate','scorpion','druid','crawler','banshee','jelly','dragon','demon','dust','elf','hound','horror','beast'])assert(E.monsters[id],'Old save ID missing: '+id);
s=fresh();assert.equal(E.start(s,'chicken'),'');E.advance(s,100000);assert(s.stats.kills.chicken>=1);assert.match(E.start(fresh(),'abyssal-demon'),/Slayer level 85/);
const oldSave=fresh();oldSave.task={id:'rat',kind:'combat',remaining:null};oldSave.running=true;assert.equal(E.restore(oldSave).task.id,'rat');
console.log('Engine passed: XP curves, 23 skills, gathering/crafting, ordered queues, loops, material blocking, offline cap, bank capacity, trade, gear, goals, combat, saves and invalid imports.');
console.log('Monster progression passed: 36 ordered enemies, starter availability, location/tier/search filters, Slayer gates and existing-save IDs.');

